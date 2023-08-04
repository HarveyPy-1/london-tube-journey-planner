// DECLARE ALL NECESSARY REQUIREMENTS
const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
// const puppeteer = require("puppeteer");

//IMPORT CONVERTED FILE(TO OBJECT) FROM (FILECONVERSION.JS)
const { readJsonFile } = require("./fileConversion.js");
const { request } = require("http");

// FUNCTION TO MAKE SURE THE JSON FILE IS READ BEFORE CONTINUING
async function startApp() {
	try {
		const jsonData = await readJsonFile("./naptanIDs.json");
		return jsonData;
		// console.log(jsonData);
	} catch (err) {
		console.error("Error reading the file:", err);
		return {};
	}
}

// START THE MODULE FOR ENVIRONMENT VARIABLES
require("dotenv").config();

// DECLARE SOME NECESSARY CONSTANTS
const PORT = process.env.PORT || 3000;
const app = express();
const API_KEY = process.env.API_KEY;

// LOAD SOME MIDDLEWARE
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.set("view engine", "ejs");

// HOME PAGE
app.get("/", (req, res) => {
	var mailChimp = 0;
	res.render("index", { mailChimp: mailChimp });
});

// HANDLE POST REQUEST FOR HOME PAGE (NEWSLETTER SUBSCRIPTION)
app.post("/", (req, res) => {
	const firstName = req.body.fName;
	const lastName = req.body.lName;
	const email = req.body.newsEmail;
	const list_id = process.env.AUDIENCE_ID;
	const server_no = "21";

	const url = `https://us${server_no}.api.mailchimp.com/3.0/lists/${list_id}`;

	const options = {
		method: "POST",
		auth: process.env.API_KEY_2,
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

	const jsonData = JSON.stringify(data);

	let mailChimp = 0;
	const request = https.request(url, options, (response) => {
		if (response.statusCode === 200) {
			mailChimp = 1;
			res.render("index", { mailChimp: mailChimp });
		} else {
			mailChimp = -1;
			res.render("index", { mailChimp: mailChimp });
		}
		response.on("data", (data) => {
			console.log(JSON.parse(data));
		});
	});
	request.write(jsonData);
	request.end();

	console.log(firstName, lastName, email, list_id);
});

// GENERAL FAILURE REDIRECT PAGE
app.get("/failure", (req, res) => {
	var mailChimp = 0;
	res.render("failure", { mailChimp: mailChimp });
});

// PAGE TO DISPLAY JOURNEY ITINERARY
app.post("/transport-details", async (req, res) => {
	try {
		// GET DEPARTURE AND DESTINATION VALUES FROM EJS FILE
		const departure = req.body.departure;
		const destination = req.body.destination;
		const departureDate = req.body.date.replace(/-/g, "");

		// CONVERT TIME INTO HH:MM TO DISPLAY ON WEBSITE
		function formatTime(dateTimeString) {
			const dateTime = new Date(dateTimeString);
			const hours = dateTime.getHours();
			const minutes = dateTime.getMinutes();
			const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
				.toString()
				.padStart(2, "0")}`;
			return formattedTime;
		}

		// FORMAT TIME INTO HHMM FOR USE IN API ENDPOINT
		function convertTimeToHHmm(timeString) {
			const [hours, minutes] = timeString.split(":");
			return hours + minutes;
		}

		const departureTime = convertTimeToHHmm(req.body.time);
		const ejsDate = req.body.date;
		const timeArgument = req.body.timeOptions;

		console.log("Departure Date: ", departureDate);
		console.log("Departure Time: ", departureTime);
		console.log("Departing or Arriving: ", timeArgument);

		// START FUNCTION TO LOAD JSONDATA FILE
		startApp().then((jsonData) => {
			// console.log(jsonData);

			// GET NAPTANID VARIABLES FROM USER INPUT
			const departureID = getNaptanIDByCommonName(departure, jsonData);
			const destinationID = getNaptanIDByCommonName(destination, jsonData);

			console.log(departureID, destinationID);

			// API ENDPOINT
			const url = `https://api.tfl.gov.uk/journey/journeyresults/${departureID}/to/${destinationID}?date=${departureDate}&time=${departureTime}&timeIs=${timeArgument}&app_key=${API_KEY}`;

			// MAKE HTTPS REQUEST TO ENDPOINT
			const request = https.request(url, (response) => {
				console.log(response.statusCode);

				let responseData = "";

				response.on("data", (chunk) => {
					responseData += chunk;
				});

				response.on("end", () => {
					try {
						const tflData = JSON.parse(responseData);
						console.log(tflData);

						// GET REQUIRED DATA FROM THE TFLDATA AND ASSIGN TO VARIABLES
						let tflDepartureTime = tflData.journeys[0].startDateTime;
						let tflArrivalTime = tflData.journeys[0].arrivalDateTime;
						const ejsDepartureTime = formatTime(tflDepartureTime);
						const ejsArrivalTime = formatTime(tflArrivalTime);

						// VARIABLE TO RULE THEM ALL
						const allJourneys = tflData.journeys;

						//TODO3: DURATION
						const duration = tflData.journeys[0].duration;
						console.log("Duration: ", duration);

						// COST
						let fare;
						if (
							tflData.journeys[0] &&
							tflData.journeys[0].fare &&
							tflData.journeys[0].fare.totalCost
						) {
							fare = (tflData.journeys[0].fare.totalCost / 100).toFixed(2);
						} else {
							fare = NaN;
						}

						console.log("Fare: ", fare);

						// CURRENT DATE FOR FOOTER
						const currentDate = new Date();
						var mailChimp = 0;

						// LOGIC FOR PAGE RESPONSE REDIRECTION
						if (response.statusCode === 200) {
							res.render("transport-details", {
								departure: departure,
								destination: destination,
								date: ejsDate,
								departureTime: ejsDepartureTime,
								arrivalTime: ejsArrivalTime,
								duration: duration,
								totalFare: fare,
								currentDate: currentDate,
								mailChimp: mailChimp,
								allJourneys: allJourneys,
								formatTime: formatTime,
							});
							console.log(req.method);
						}
						// HANDLE ERROR IS JSON DATA IS NOT READ OR LOADED
					} catch (error) {
						var mailChimp = 0;
						console.error("Error:", error);
						res.render("failure", { mailChimp: mailChimp });
					}
				});
			});
			// HANDLE ERROR
			request.on("error", (error) => {
				var mailChimp = 0;
				console.error("Error:", error);
				res.render("failure", { mailChimp: mailChimp });
			});
			request.end();
		});
		// HANDLE ERRORS ARISING FROM THE API CALL
	} catch (error) {
		var mailChimp = 0;
		console.error("Error:", error);
		res.render("failure", { mailChimp: mailChimp });
	}
});

// FUNCTION TO GET NAPTANID BASED ON USER INPUT
function getNaptanIDByCommonName(commonName, jsonData) {
	const matchingObject = jsonData.find(
		(item) => item.commonName.toLowerCase() === commonName.toLowerCase()
	);

	if (matchingObject) {
		return matchingObject.naptanID;
	} else {
		return null;
	}
}

// CREATE GET ROUTE FOR 'TRANSPORT DETAILS' WHICH JUST REDIRECTS TO  HOMEPAGE(USED RENDER SO I CAN PASS VARIABLES AS RES.REDIRECT DOES NOT SUPPORT IT)
app.get("/transport-details", (req, res) => {
	var mailChimp = 0;
	res.render("index", { mailChimp: mailChimp });
});

// CREATE 'ABOUT US' ROUTE
app.get("/about-us", (req, res) => {
	var mailChimp = 0;
	res.render("about-us", { mailChimp: mailChimp });
});

// CREATE 'CONTACT US' ROUTE (GET)
app.get("/contact-us", (req, res) => {
	var mailChimp = 0;
	var messageStatus = 0;
	res.render("contact-us", {
		messageStatus: messageStatus,
		mailChimp: mailChimp,
	});
});

// CREATE 'CONTACT US' ROUTE (POST) TO SEND EMAILS
app.post("/contact-us", (req, res) => {
	// GET USER VARIABLES FROM FORM
	const firstName = req.body.firstName;
	const lastName = req.body.lastName;
	const email = req.body.email;
	const message = req.body.message;
	var mailChimp = 0;

	// CREATE TRANSPORTER OBJECT FROM NODEMAILER TO BE SENT TO MAILTRAP
	const transporter = nodemailer.createTransport({
		host: "sandbox.smtp.mailtrap.io",
		port: 2525,
		auth: {
			user: process.env.EMAIL_USERNAME,
			pass: process.env.EMAIL_PASSWORD,
		},
	});

	// GENERATE THE EMAIL CONTENT FROM USER INPUT
	const mailOptions = {
		from: "Website User website.user@yahoo.com",
		to: "website.user@yahoo.com",
		subject: "New Contact Form Submission",
		html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
	};

	// SEND EMAIL
	let messageStatus = 0; // Variable to determine page content
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			console.log("Error sending email: ", error);
			messageStatus = -1;
			res.render("contact-us", {
				messageStatus: messageStatus,
				mailChimp: mailChimp,
			});
		} else {
			console.log("Email sent: ", info.response);
			messageStatus = 1;
			res.render("contact-us", {
				messageStatus: messageStatus,
				mailChimp: mailChimp,
			});
		}
		console.log("Message Status: ", messageStatus);
	});
});

// CREATE CONVERT TO PDF AND DOWNLOAD FUNCTION
// async function convertToPDF(req, res) {
// 	const webpageURL = "http://localhost:3000/transport-details";
// 	const outputPDFFileName = "journey-itinerary.pdf";

// 	try {
// 		const browser = await puppeteer.launch({ headless: "new" });
// 		const page = await browser.newPage();

// 		await page.goto(webpageURL, { waitUntil: "networkidle0" });

// 		// TAKE A SCREENSHOT
// 		const screenshotPath = "screenshot.png";
// 		await page.screenshot({ path: screenshotPath, fullPage: true });

// 		// ADJUST PAGE SIZE TO FIT THE WHOLE CONTENT
// 		const pdfBuffer = await page.pdf({
// 			path: screenshotPath,
// 			format: "A4",
// 			printBackground: true,
// 		});

// 		await browser.close();

// 		res.set({
// 			"Content-Type": "application/pdf",
// 			"Content-Disposition": `attachment; filename=${outputPDFFileName}`,
// 		});

// 		res.send(pdfBuffer);
// 	} catch (error) {
// 		console.error("Error generating PDF:", error);
// 		res.status(500).send("Error generating PDF");
// 	}
// }

// // CREATE CONVERT TO PDF AND DOWNLOAD LINK
// app.get("/convertToPDF", convertToPDF);

// CREATE AND START LOCAL SERVER ON SPECIFIED PORT
app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}...`);
});
