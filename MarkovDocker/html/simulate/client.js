document.getElementById('runLightdock').addEventListener('submit', async function(event) {
  event.preventDefault();

  const payload = { query: "sent response" };
  const statusEl = document.getElementById("status");

  async function sendRequest(url, backendName) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.status === 401 || response.status === 403) {
      window.location.href = "/login/";
      return;
    }

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!response.ok) throw new Error(`${backendName} failed`);

    return data;
  }

  try {
    await sendRequest("/server_one/html/simulate", "Node server");
    await sendRequest("/receive_signal/html/simulate", "Flask server");

    statusEl.innerText = "Simulation complete";

  } catch (err) {
    statusEl.innerText = "Simulation failed: " + err.message;
  }
});