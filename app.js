// DECLARE ALL NECESSARY REQUIREMENTS
const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const puppeteer = require("puppeteer");

//IMPORT CONVERTED FILE(TO OBJECT) FROM (FILECONVERSION.JS)
const { readJsonFile } = require("./fileConversion.js");

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
app.post("/transport-details", (req, res) => {
	// GET DEPARTURE AND DESTINATION VALUES FROM EJS FILE
	const departure = req.body.departure;
	const destination = req.body.destination;
	const departureDate = req.body.date.replace(/-/g, "");

	// LOGIC journeys[0, 1, 2, length].legs[0].departureTime = first line departure times
	// LOGIC journeys[0, 1, 2, length].legs[1].departureTime = second line/stop departure times
	// LOGIC journeys[0, 1, 2, length].legs[2].departureTime = third line/stop departure times, etc
	// LOGIC journeys[0].legs[0, 1, 2, length].instruction.summary = Step by step instruction to get there
	// LOGIC journeys[0].legs[0, 1, 2, length].path.stopPoints[0, 1, 2, length].name = Stops during each leg
	// LOGIC - Get off at journeys[0].legs[0, 1, 2, length].arrivalPoint.commonName
	// LOGIC journeys[0].legs[0].routeOptions[0].name = Tube line name
	// LOGIC journeys[0].legs[0].interChangeDuration = number of minutes before next train
	// LOGIC journeys[0].legs[0, 1, 2, length].arrivalPoint.platformName = Platform name
	// LOGIC journeys[0].legs[0, 1, 2, length].disruptions = disruptions
	// LOGIC journeys[0].legs[0, 1, 2, length].plannedWorks = planned works

	// DELETE route

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
		const url = `https://api.tfl.gov.uk/journey/journeyresults/${departureID}/to/${destinationID}?date=${departureDate}&time=${departureTime}&timeIs=${timeArgument}&mode=tube&app_key=${API_KEY}`;

		// MAKE HTTPS REQUEST TO ENDPOINT
		const request = https.request(url, (response) => {
			console.log(response.statusCode);

			let responseData = "";

			response.on("data", (chunk) => {
				responseData += chunk;
			});

			response.on("end", () => {
				const tflData = JSON.parse(responseData);
				console.log(tflData);

				// GET REQUIRED DATA FROM THE TFLDATA AND ASSIGN TO VARIABLES
				let tflDepartureTime = tflData.journeys[0].startDateTime;
				let tflArrivalTime = tflData.journeys[0].arrivalDateTime;
				const ejsDepartureTime = formatTime(tflDepartureTime);
				const ejsArrivalTime = formatTime(tflArrivalTime);

				const allJourneys = tflData.journeys;

				// TODO1: ROUTE BETWEEN TWO LINES. TELL USER THE ROUTE IF EXISTS
				// DONE!

				// TODO2: STOP POINTS
				// DONE!

				//TODO3: DURATION
				const duration = tflData.journeys[0].duration;
				console.log("Duration: ", duration);

				// TODO4: DEPARTURE POINT
				// DONE!

				// TODO5: ARRIVAL POINT
				// DONE!

				// TODO6: DISRUPTIONS
				// DONE!

				//TODO 7: COST
				const fare = (tflData.journeys[0].fare.totalCost / 100).toFixed(2);

				console.log("Fare: ", fare);

				// TODO 8: DEPARTURE TIME
				// Create input for departure time and date in the format: yyyymmdd and HHmm.

				// TODO 9: TODAY'S DATE
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
				} else {
					res.render("failure", { mailChimp: mailChimp });
				}
			});
		});

		// HANDLE ERROR
		request.on("error", (error) => {
			console.error("Error in API request", error);
			res.render("failure", { mailChimp: mailChimp });
		});

		request.end();
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
	// GET VARIABLES FROM FORM
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
async function convertToPDF(req, res) {
	const webpageURL = "http://localhost:3000/transport-details";
	const outputPDFFileName = "journey-itinerary.pdf";

	try {
		const browser = await puppeteer.launch({ headless: "new" });
		const page = await browser.newPage();

		await page.goto(webpageURL, { waitUntil: "networkidle0" });

		// TAKE A SCREENSHOT
		const screenshotPath = "screenshot.png";
		await page.screenshot({ path: screenshotPath, fullPage: true });

		// ADJUST PAGE SIZE TO FIT THE WHOLE CONTENT
		const pdfBuffer = await page.pdf({
			path: screenshotPath,
			format: "A4",
			printBackground: true,
		});

		await browser.close();

		res.set({
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename=${outputPDFFileName}`,
		});

		res.send(pdfBuffer);
	} catch (error) {
		console.error("Error generating PDF:", error);
		res.status(500).send("Error generating PDF");
	}
}

// CREATE CONVERT TO PDF AND DOWNLOAD LINK
app.get("/convertToPDF", convertToPDF);

// CREATE LOCAL SERVER PORT
app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}...`);
});

/*
PERSONAL HINT: Fresh page with a consistent design that lists all these parameters in a concise clean manner.

- TODO 1: Check if there's a route between the two destinations, if there is, tell the user there is a line, if so which line will take them directly from A to B.


TODO 2: Make a key with a colour for each train line.
When the user has selected a journey, display their journey with a line from one station to the next in the colour of that line.


TODO 3: If it is a non direct route, show the user the changes to make and depict this on the graphics as well.


TODO 4: Assume travel time from one station to the other in the same zone is 4 minutes. 
Assume traveling up or down one zone will take an additional 3 minutes.
Provide total time for journey, as well as individual journey travel time.


TODO 5: - The cost of traveling from one zone to the same zone is £4.23.
- To travel to a zone in a higher number (i.e. from 1 -> 2) costs an additional 15p.
- To travel to a zone with a lower number (i.e. from 4 -> 3) costs an addition 17p.
The cost of travelling between zones **only** applies to the start and end station, **not** any changes in between.
Calculate how expensive the user's journey will be and display the cost to the user.

TODO 6: Add any more complexities you think you might like.




let url = "https://api.tfl.gov.uk/journey/journeyresults/1000008/to/1000107";
const options = {
  method: "GET",
  headers: {
    "Cache-Control": "no-cache",
  },
};

const response = fetch(url, options)
  .then((res) => res.json())
  .then((obj) => {
    console.log("output", obj);
    const journey = obj.journeys[0].legs[0].path.stopPoints;
    console.log("stopPoints", journey);
  });
*/
