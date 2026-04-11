const greeting = document.getElementById("greeting");
const waveBtn = document.getElementById("wave");
const themeToggle = document.getElementById("theme-toggle");

const THEME_KEY = "labs-theme";

function getTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function setTheme(theme) {
  var next = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  themeToggle.setAttribute(
    "aria-label",
    next === "dark" ? "Switch to light theme" : "Switch to dark theme"
  );
}

themeToggle.addEventListener("click", () => {
  setTheme(getTheme() === "dark" ? "light" : "dark");
});

setTheme(getTheme());

let clicks = 0;

waveBtn.addEventListener("click", () => {
  clicks += 1;
  greeting.textContent =
    clicks === 1 ? "Hi there — nice to meet you!" : `You clicked ${clicks} times. Hello again!`;
});
