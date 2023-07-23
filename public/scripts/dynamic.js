async function readJsonData(jsonDataUrl) {
	try {
		const response = await fetch(jsonDataUrl);
		if (!response.ok) {
			throw new Error("Network response was not ok");
		}
		return await response.json();
	} catch (error) {
		console.error("Error fetching JSON data:", error);
		return [];
	}
}

function displaySuggestions(jsonData, searchTerm, suggestionsList) {
	const filteredData = jsonData.filter((item) =>
		item.commonName.toLowerCase().includes(searchTerm.toLowerCase())
	);

	const suggestionItems = filteredData.map(
		(item) => `<li>${item.commonName}</li>`
	);

	suggestionsList.innerHTML = suggestionItems.join("");
}

function initializeAutocomplete(inputId, suggestionsId) {
	const jsonDataUrl = "/data/naptanIDs.json";
	const searchInput = document.getElementById(inputId);
	const suggestionsList = document.getElementById(suggestionsId);

	let jsonData = [];

	readJsonData(jsonDataUrl)
		.then((data) => {
			jsonData = data;

			searchInput.addEventListener("input", function (event) {
				const searchTerm = event.target.value;
				displaySuggestions(jsonData, searchTerm, suggestionsList);
			});

			document.addEventListener("click", function (event) {
				const target = event.target;
				if (target.matches(`#${suggestionsId} li`)) {
					const suggestionText = target.textContent.trim();
					searchInput.value = suggestionText;
					suggestionsList.innerHTML = "";
				}
			});
			document.addEventListener("keydown", function (event) {
				if (event.key === "Escape") {
					suggestionsList.innerHTML = "";
				}
			});
		})
		.catch((error) => {
			console.error("Error:", error);
		});
}

// Initialize the first input and suggestions list
initializeAutocomplete("searchQuery1", "suggestions1");

// Initialize the second input and suggestions list
initializeAutocomplete("searchQuery2", "suggestions2");
