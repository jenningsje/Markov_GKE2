document.getElementById('runLightdock').addEventListener('submit', async function(event) {
  event.preventDefault();

  const statusEl = document.getElementById("status");

  try {
    const response = await fetch("/server_one/html/simulate", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: "sent response"
      })
    });

    if (response.status === 401 || response.status === 403) {
      window.location.href = "/login/";
      return;
    }

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw new Error(
        data?.error || data?.message || "Node server failed"
      );
    }

    statusEl.innerText = "Simulation complete";

  } catch (err) {
    console.error("Simulation request failed:", err);
    statusEl.innerText = "Simulation failed: " + err.message;
  }
});