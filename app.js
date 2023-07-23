// DECLARE ALL NECESSARY REQUIREMENTS
const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");

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
app.set("view engine", "ejs");

// HOME PAGE
app.get("/", (req, res) => {
	res.render("index");
});

// HOME PAGE POST REQUEST
app.post("/transport-details", (req, res) => {
	// GET DEPARTURE AND DESTINATION VALUES FROM EJS FILE
	const departure = req.body.departure;
	const destination = req.body.destination;
	const departureDate = req.body.date.replace(/-/g, "");

	function convertTimeToHHmm(timeString) {
		const [hours, minutes] = timeString.split(":");
		return hours + minutes;
	}

	const departureTime = convertTimeToHHmm(req.body.time);
  const ejsTime = req.body.time;
  const ejsDate = req.body.date;
	const noOfPassengers = req.body.passengers;

	console.log("Departure Date: ", departureDate);
	console.log("Departure Time: ", departureTime);
	console.log("No. of passengers: ", noOfPassengers);

	// START FUNCTION TO LOAD JSONDATA FILE
	startApp().then((jsonData) => {
		// console.log(jsonData);

		//GET NAPTANID VARIABLES FROM USER INPUT
		const departureID = getNaptanIDByCommonName(departure, jsonData);
		const destinationID = getNaptanIDByCommonName(destination, jsonData);

		console.log(departureID, destinationID);

		// API ENDPOINT
		const url = `https://api.tfl.gov.uk/journey/journeyresults/${departureID}/to/${destinationID}?date=${departureDate}&time=${departureTime}&timeIs=departing&app_key=${API_KEY}`;

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

				// TODO1: ROUTE BETWEEN TWO LINES. TELL USER THE ROUTE IF EXISTS
				const route = tflData.journeys[0].legs[0].instruction.detailed;
				console.log("Route: ", route);

				// TODO2: STOP POINTS
				const stopPoints = tflData.journeys[0].legs[0].path.stopPoints;
				// console.log(stopPoints)

				// USE THIS IN THE EJS FILE
				// for (let x = 0; x < stopPoints.length; x++) {
				//   console.log(stopPoints[x].name);
				// }

				//TODO3: DURATION
				const duration = tflData.journeys[0].duration;
				console.log("Duration: ", duration);

				// TODO4: DEPARTURE POINT
				const departurePoint =
					tflData.journeys[0].legs[0].departurePoint.commonName;
				console.log("Departure point: ", departurePoint);

				// TODO5: ARRIVAL POINT
				const arrivalPoint =
					tflData.journeys[0].legs[0].arrivalPoint.commonName;
				console.log("Arrival point: ", arrivalPoint);

				// TODO6: DISRUPTIONS
				const isDisrupted = tflData.journeys[0].legs[0].isDisrupted;
        console.log(isDisrupted)

        let disruptions;
        let plannedWorks;
				if (isDisrupted === false) {
					const disruptions = "No disruptions on route.";
					const plannedWorks = "No planned works on route.";
          // console.log(disruptions);
					// console.log(plannedWorks);
				} else {
					const disruptions =
						tflData.journeys[0].legs[0].disruptions[0].description;
					const plannedWorks = tflData.journeys[0].legs[0].plannedWorks;
				}
        console.log(disruptions);
				console.log(plannedWorks);

				//TODO 7: COST
				const fare = (((tflData.journeys[0].fare.totalCost) / 100) * noOfPassengers).toFixed(2);
				console.log("Fare: ", fare);

				// TODO 8: DEPARTURE TIME
				// Create input for departure time and date in the format: yyyymmdd and HHmm. Add more parameters to the API URL in this format: https://api.tfl.gov.uk/journey/journeyresults/{from}/to/{to?date={20230810}&time={0930}&timeIs=departing&app_key=ca33a01de1e44f28a4ffd7e01eaddfe5

				// LOGIC FOR REDIRECTION
				if (response.statusCode === 200) {
					res.render("transport-details", {
            departure: departure,
            destination: destination,
            date: ejsDate,
            time: ejsTime,
            noOfPassengers: noOfPassengers,
            route: route,
            duration: duration,
            departurePoint: departurePoint,
            arrivalPoint: arrivalPoint,
            stopPoints: stopPoints,
            disruptions: disruptions,
            plannedWorks: plannedWorks,
            totalFare: fare
          });
				} else {
					res.render("failure");
				}
			});
		});

		// HANDLE ERROR
		request.on("error", (error) => {
			console.error("Error in API request", error);
			res.render("failure");
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
