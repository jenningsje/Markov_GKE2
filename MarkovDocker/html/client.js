document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('searchForm');
  const inputEl = document.querySelector('.container > .input');

  if (!form || !inputEl) {
    console.error('Form or input element not found!');
    return;
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const searchQuery = inputEl.value.trim();

    if (!searchQuery) {
      console.warn('Search query is empty!');
      return;
    }

    try {
      fetch("/server_one/html", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({ query: searchQuery })
      })
        .then(async response => {
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            if (!response.ok) throw data.error || 'Server error';
            return data;
          } catch (e) {
            // If it wasn't JSON, throw the raw text/HTML or a friendly message
            throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`);
          }
        })
        .then(data => {
          console.log('Search results:', data);
        })
        .catch(error => console.error('Error:', error));

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          `Request failed with status ${response.status}`
        );
      }

      console.log('Search input sent successfully:', data);

      // Clear the search box after successful submission.
      inputEl.value = '';

    } catch (error) {
      console.error('Error sending search input:', error);
    }
  });

});
