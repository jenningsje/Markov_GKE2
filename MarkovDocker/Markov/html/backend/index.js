const { JSDOM } = require('jsdom');

const dom = new JSDOM(htmlContent);

// Access the window and document objects
const window = dom.window;
const document = window.document;

const searchInput = document.querySelector('.input')

searchInput.addEventListener("input"), (e) => {
  // inside, we will need to achieve a few things:
  // 1. declare and assign the value of the event's target to a variable AKA whatever is typed in the search bar
  let value = e.target.value

  // 2. check: if input exists and if input is larger than 5
  if (value && value.trim().length > 0){
      // 3. redefine 'value' to exclude white space and change input to all lowercase
        protein = protein.trim().toLowerCase()
      // 4. return first 7 results only if the protein of the search is included in either the protein data bank or the alpha fold data bank
      // we need to write code (a function for filtering through the data to include the search input value)
      //returning only the results of setList if the value of the search is included in the protein databank
      setList(people.filter(proteins => {
        return proteins.name.includes(value)
    }))
  } else {
      // 5. return nothing
      clearList()
  }

}

console.log("it works")