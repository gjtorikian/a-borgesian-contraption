const url = "/generator";
const ending = "…";
let endingLength = ending.length;
let count = 0;

const buttons = Array.from(document.getElementsByClassName("start"));
const holder = document.getElementById("holder");
const counter = document.getElementById("counter");

async function start() {
  let initialButtonJson = await getData(`${url}/start`);

  buttons.forEach(function (button, idx) {
    button.innerText = `${initialButtonJson.prompts[idx]}${ending}`;
    button.classList.remove("is-loading");

    button.onclick = async function (event) {
      let el = event.currentTarget;

      spinButtons();

      let buttonText = el.innerText.slice(0, -endingLength);

      addText(buttonText);

      submitAndReceive(holder.innerText);
    };
  });
}

async function submitAndReceive(prompt) {
  // story continuation text
  let resultJson = await postData(`${url}/prompt`, {
    prompt: prompt,
    counter: counter.innerText,
  });

  let newText = resultJson.result.text;
  span = createSpan(newText);
  holder.appendChild(span);
  setFlash(span);

  if (!resultJson.result.reached_limit) {
    // generate button text
    let generatedJson = await postData(`${url}/generate`, {
      prompt: holder.textContent,
      counter: counter.innerText,
    });

    Array.prototype.forEach.call(buttons, async function (button, idx) {
      button.innerText = `${generatedJson.results.texts[idx]}${ending}`;
      button.classList.remove("is-loading");
    });
  } else {
    buttons.forEach(function (button) {
      button.classList.add("is-hidden");
    });
  }
}

async function getData(url) {
  let response = await fetch(url);

  if (response.ok) {
    return await response.json();
  } else {
    console.error("HTTP-Error: " + response.status);
    return {};
  }
}

async function postData(url, data) {
  let response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (response.ok) {
    return await response.json();
  } else {
    console.error("HTTP-Error: " + response.status);
    return {};
  }
}

function addText(text) {
  let span = createSpan(text);
  // first button click
  if (count == 1) {
    // replace explanation text with the first button text
    holder.replaceChild(span, holder.childNodes[0]);
  } else {
    holder.appendChild(span);
  }

  setFlash(span);
}

function createSpan(text) {
  // create a new span element
  let newSpan = document.createElement("span");
  // and give it some content
  let newContent = document.createTextNode(text);
  // add the text node to the newly created span
  newSpan.appendChild(newContent);

  return newSpan;
}

function setFlash(span) {
  span.classList.add("flash");
  setTimeout(function () {
    span.classList.remove("flash");
  }, 6000);
}

function spinButtons() {
  counter.innerText = ++count;
  buttons.forEach(function (button) {
    button.classList.add("is-loading");
  });
}

window.addEventListener("DOMContentLoaded", start);
