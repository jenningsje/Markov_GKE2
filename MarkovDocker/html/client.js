document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('searchForm');
  const inputEl = document.querySelector('.container > .input');

  if (!form || !inputEl) {
    console.error("Form or input element not found!");
    return;
  }

  form.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission

    const searchQuery = inputEl.value.trim(); // get input value safely
    if (!searchQuery) return console.warn("Search query is empty!");

    fetch("/server_one/html", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify({ query: searchQuery })
    })
      .then(response => response.ok ? response.json() : Promise.reject('Network error'))
      .then(data => {
        console.log('Search results:', data);
        // Handle results (display them, etc.)
      })
      .catch(error => console.error('Error:', error));
  });
});