// const express = require("express");
// const bodyParser = require("body-parser");
// const https = require("https");

// require("dotenv").config(); //Loads the .env file that holds the sensitive variables

// const PORT = process.env.PORT || 3000; // Checks environment variable if it is defined(true), if not (false) ||, it assigns 3000 to it.

// const app = express();
// app.use(bodyParser.urlencoded({ extended: true }));

// app.use(express.static(__dirname + "/")); // This line of code enabled my external css to work with the html.

// app.get("/", (req, res) => {
// 	res.sendFile(`${__dirname}/index.html`);
// });

import { newsletterAPI, newsletterAudienceID } from "../../app";
console.log(newsletterAPI);
console.log(newsletterAudienceID);

jQuery(function () {
	$(document).on("click", "#subscribe-button", function () {
		const firstName = $("#fName").val();
		const lastName = $("#lName").val();
		const email = $("#email").val();
		console.log(firstName, lastName, email);

		const list_id = newsletterAudienceID;
		const server_no = "21"; // Gotten at the back of your API
		const url = `https://us${server_no}.api.mailchimp.com/3.0/lists/${list_id}`;
		const options = {
			method: "POST",
			auth: newsletterAPI,
		};

		const data = {
			members: [
				{
					email_address: email,
					status: "subscribed",
					merge_fields: {
						FNAME: firstName,
						LNAME: lastName,
					},
				},
			],
		};

		fetch(url, options, {
			method: "POST",
			jsonData: JSON.stringify(data),
		})
			.then((response) => response.json)
			.then((data) => {
				console.log("Response from server: ", data);
			})
			.catch((error) => {
				console.error("Error making request: ", error);
			});
	});
});

// console.log(firstName, lastName, email);

// app.post("/failure", (req, res) => {
// 	res.redirect("/");
// });

// app.listen(PORT, () => {
// 	console.log(`Server is running on port ${PORT}...`);
// });
