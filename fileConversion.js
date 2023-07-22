const fs = require("fs");

function readJsonFile(filePath) {
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, "utf-8", (err, data) => {
			if (err) {
				reject(err);
			} else {
				const jsonData = JSON.parse(data);
				resolve(jsonData);
			}
		});
	});
}

module.exports = { readJsonFile };
