const timerElem = document.getElementById("timer");
let flashInterval = null;
let resetTimeout = null;
const originalColor = getComputedStyle(document.body).color;

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (!showSeconds) {
    return hrs > 0 ? `${hrs}:${String(mins).padStart(2, '0')}` : `${mins}`;
  }
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function flashTimer() {
  if (flashInterval) return;
  let visible = true;
  flashInterval = setInterval(() => {
    timerElem.style.visibility = visible ? "hidden" : "visible";
    visible = !visible;
  }, 500);

  resetTimeout = setTimeout(async () => {
    clearInterval(flashInterval);
    flashInterval = null;
    timerElem.style.visibility = "visible";
    document.body.style.color = originalColor;
    await fetch("/api/reset", {method: "POST"});
  }, 10000);
}

async function fetchStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    let remaining = data.remaining;

    if (remaining === 0 && data.running) {
      flashTimer();
    }

    if (remaining > 0) {
      timerElem.textContent = formatTime(remaining);
      timerElem.style.visibility = "visible";
      if (remaining <= 60) {
        document.body.style.color = "red";
      } else {
        document.body.style.color = originalColor;
      }
    } else {
      timerElem.textContent = "00:00";
    }
  } catch (err) {
    console.error(err);
  }
}

setInterval(fetchStatus, 1000);
fetchStatus();
