document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('searchForm');
  const inputEl = document.querySelector('.container > .input');
  const statusEl = document.getElementById('status');

  if (!form || !inputEl) {
    console.error('Search form or input element not found!');
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const searchQuery = inputEl.value.trim();

    if (!searchQuery) {
      if (statusEl) {
        statusEl.innerText = 'Please enter a query.';
      }
      return;
    }

    try {
      if (statusEl) {
        statusEl.innerText = 'Sending query...';
      }

      const response = await fetch('/server_one/html', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery
        })
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Server returned non-JSON response (${response.status}): ${text.substring(0, 200)}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          `Request failed with status ${response.status}`
        );
      }

      console.log('Query successfully sent to server_one:', data);

      if (statusEl) {
        statusEl.innerText =
          `Query sent successfully for user-${data.user_id}`;
      }

      inputEl.value = '';

    } catch (error) {
      console.error(
        'Error sending query to server_one:',
        error
      );

      if (statusEl) {
        statusEl.innerText =
          `Error sending query: ${error.message}`;
      }
    }
  });
});