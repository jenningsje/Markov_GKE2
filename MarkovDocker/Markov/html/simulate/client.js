document.getElementById('runLightdock').addEventListener('click', function(event) {
  event.preventDefault(); // Prevent form submission

  // Make a POST request to the backend with the search query
  fetch("http://localhost:5001/html/simulate", {
    method: "POST",
    body: JSON.stringify({ query: "sent response" }),
    headers: {
      "Content-type": "application/json; charset=UTF-8"
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log('Search results:', data);
      // Handle the search results, e.g., display them on the page
    })
    .catch(error => {
      console.error('Error:', error);
    });
});
