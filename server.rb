# frozen_string_literal: true

require "ruby/openai"
require "sinatra"

begin
  require "awesome_print"
  require "dotenv"
  require "pry-byebug"
rescue LoadError; end # rubocop:disable Lint/SuppressedException
class ABorgesianContraption < Sinatra::Base
  set :root, File.dirname(__FILE__)
  enable :sessions

  not_found do
    markdown :notfound
  end

  PROMPTS = File.read(File.join(settings.root, "public", "texts", "prompts.txt")).split("\n").map(&:strip)
  OPENAI_CLIENT = OpenAI::Client.new(access_token: ENV["OPENAI_ACCESS_TOKEN"])

  MAX_LENGTH = 22
  TEMPERATURE = 0.9
  # TOP_K = 9
  TOP_P = 1.0
  REPETITION_PENALTY = 1.4
  FREQUENCY_PENALTY = 0.52

  MAX_TIMES = 10

  get "/" do
    erb :index
  end

  get "/about" do
    erb :about
  end

  get "/generator/start" do
    { prompts: PROMPTS.sample(5) }.to_json
  end

  post "/generator/prompt" do
    request.body.rewind
    body = request.body.read
    payload = JSON.parse(body)

    prompt = payload["prompt"].to_s.strip
    counter = payload["counter"].to_i

    result = sequence(prompt, counter, 1)

    { result: result }.to_json
  end

  post "/generator/generate" do
    request.body.rewind
    body = request.body.read
    payload = JSON.parse(body)

    prompt = payload["prompt"].to_s.strip
    counter = payload["counter"].to_i

    results = sequence(prompt, counter, 5)
    { results: results }.to_json
  end

  private def sequence(prompt, counter, n)
    reached_limit = false

    parameters = {
      model: "davinci-002",
      prompt: prompt,
      max_tokens: MAX_LENGTH,
      temperature: TEMPERATURE,
      top_p: TOP_P,
      frequency_penalty: FREQUENCY_PENALTY,
      n: n,
    }

    if counter == MAX_TIMES
      # provide a period -- we are wrapping up
      parameters[:logit_bias] = { "13": 5, "50256": 5 }
      reached_limit = true
    end

    generated_sequences = OPENAI_CLIENT.completions(parameters: parameters)

    if n == 1
      text = generated_sequences["choices"][0]["text"]
      text = text.sub(/\.[^")]+/, ".") if reached_limit # end it

      { text: remove_newlines(text), reached_limit: reached_limit }
    else
      { texts: generated_sequences["choices"].map { |c| remove_newlines(c["text"]) }, reached_limit: reached_limit }
    end
  end

  private def remove_newlines(text)
    text.gsub(/\A\n+/, "").gsub(/\n+\z/, "").gsub(/\n+/, " ")
  end
end
