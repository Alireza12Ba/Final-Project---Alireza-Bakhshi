// Set up dimensions and margins for the map
const width = 1200;
const height = 800;
// Create an SVG element to hold the map
const svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

// Set up a projection and path generator
const projection = d3.geoMercator().scale(150).translate([width / 2, height / 1.5]);
const path = d3.geoPath().projection(projection);

// Define a color scale
const colorScale = d3.scaleSequential(d3.interpolateCool)
    .domain([30, -10]);  // Adjust the domain based on your temperature data range

// Load external data
Promise.all([
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
    d3.csv("https://raw.githubusercontent.com/Alireza12Ba/Global-Temperature-Data/main/GlobalLandTemperaturesByCountry_cleaned.csv"),
    d3.csv("https://raw.githubusercontent.com/Alireza12Ba/Global-Temperature-Data/main/CItyandStateData.csv")
]).then(function([world, data, cityStateData]) {
    // Process the data
    const tempData = {};
    data.forEach(d => {
        if (!tempData[d.Country]) {
            tempData[d.Country] = { temperature: 0, count: 0 };
        }
        tempData[d.Country].temperature += parseFloat(d.AverageTemperature);
        tempData[d.Country].count += 1;
    });

    Object.keys(tempData).forEach(country => {
        tempData[country].temperature /= tempData[country].count;
    });

    // Draw the map
    svg.append("g")
        .selectAll("path")
        .data(world.features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", d => {
            const country = d.properties.name;
            const temp = tempData[country] ? tempData[country].temperature : null;
            return temp ? colorScale(temp) : "#ccc";
        })
        .attr("stroke", "#333")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke", "orange");
            const country = d.properties.name;
            const temp = tempData[country] ? tempData[country].temperature.toFixed(2) : "No data";
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<strong>${country}</strong><br>Temperature: ${temp}°C`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke", "#333");
            tooltip.transition().duration(500).style("opacity", 0);
        })
        .on("click", function(event, d) {
            if (event.shiftKey) {
                // Show line chart for the country
                showCountryLineChart(d.properties.name);
            } else {
                // Show detailed map for the country
                showCountryDetails(d.properties.name);
            }
        });

    // Tooltip
    const tooltip = d3.select(".tooltip");

    // Add legend
    const legend = d3.select("#legend");
    const legendWidth = 20;
    const legendHeight = 200;
    const legendSvg = legend.append("svg")
        .attr("width", legendWidth)
        .attr("height", legendHeight);

    const gradient = legendSvg.append("defs")
        .append("linearGradient")
        .attr("id", "gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(30));
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale(-10));

    legendSvg.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#gradient)");

    const yScale = d3.scaleLinear()
        .domain([30, -10])
        .range([0, legendHeight]);

    const yAxis = d3.axisRight(yScale)
        .ticks(5)
        .tickFormat(d => `${d}°C`);

    legendSvg.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(yAxis);

    // Set min and max values
    d3.select("#max-temp").text(`${d3.max(data, d => parseFloat(d.AverageTemperature)).toFixed(2)}°C`);
    d3.select("#min-temp").text(`${d3.min(data, d => parseFloat(d.AverageTemperature)).toFixed(2)}°C`);

    // Function to show line chart for the selected country
    function showCountryLineChart(country) {
        // Filter data for the selected country
        const countryData = data.filter(d => d.Country === country);

        // Set up dimensions and margins for the line chart
        const lineChartWidth = 1200;
        const lineChartHeight = 500;
        const margin = { top: 20, right: 30, bottom: 30, left: 40 };

        // Remove any existing line chart
        d3.select("#line-chart").selectAll("*").remove();

        // Create scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(countryData, d => new Date(d.dt)))
            .range([margin.left, lineChartWidth - margin.right]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(countryData, d => +d.AverageTemperature))
            .nice()
            .range([lineChartHeight - margin.bottom, margin.top]);

        // Create axes
        const xAxis = d3.axisBottom(xScale).ticks(12);
        const yAxis = d3.axisLeft(yScale);

        // Append axes to the SVG
        const svg = d3.select("#line-chart");
        svg.append("g")
            .attr("transform", `translate(0,${lineChartHeight - margin.bottom})`)
            .call(xAxis);

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(yAxis);

        // Create line generator
        const line = d3.line()
            .x(d => xScale(new Date(d.dt)))
            .y(d => yScale(+d.AverageTemperature));

        // Append line to the SVG
        svg.append("path")
            .datum(countryData)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", line);

        // Add title
        svg.append("text")
            .attr("x", lineChartWidth / 2)
            .attr("y", margin.top)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("text-decoration", "underline")
            .text(`Temperature Trends for ${country}`);

        // Add X axis label
        svg.append("text")
            .attr("x", lineChartWidth / 2)
            .attr("y", lineChartHeight - margin.bottom / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Year");

        // Add Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", margin.left / 2)
            .attr("x", -lineChartHeight / 2)
            .attr("dy", "-1em")
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Temperature (°C)");

        // Hide the map and legend, and show the line chart container
        d3.select("#map").style("display", "none");
        d3.select("#legend-container").style("display", "none");
        d3.select("#line-chart-container").style("display", "block");
    }

    // Function to show detailed map and bar chart for the selected country
    function showCountryDetails(country) {
        // Filter data for the selected country
        const countryData = cityStateData.filter(d => d.Country === country);

        // Set up country map dimensions and margins
        const countryMapWidth = 1200;
        const countryMapHeight = 500;

        // Remove any existing country map and bar chart
        d3.select("#country-map").selectAll("*").remove();
        d3.select("#bar-chart").selectAll("*").remove();

        // Set up projection for the country map
        const countryBounds = d3.geoBounds(world.features.find(d => d.properties.name === country));
        const countryCenter = d3.geoCentroid(world.features.find(d => d.properties.name === country));
        const countryScale = 150;

        projection
            .scale(countryScale)
            .center(countryCenter)
            .translate([countryMapWidth / 2, countryMapHeight / 2]);

        // Draw the country map
        const countrySvg = d3.select("#country-map")
            .append("svg")
            .attr("width", countryMapWidth)
            .attr("height", countryMapHeight);

        countrySvg.append("g")
            .selectAll("path")
            .data(world.features.filter(d => d.properties.name === country))
            .enter().append("path")
            .attr("d", path)
            .attr("fill", "#ccc")
            .attr("stroke", "#333");

        // Set up dimensions and margins for the bar chart
        const barChartWidth = 1200;
        const barChartHeight = 500;
        const barChartMargin = { top: 20, right: 30, bottom: 50, left: 60 };

        // Create scales for the bar chart
        const xBarScale = d3.scaleBand()
            .domain(countryData.map(d => d["City/state"]))
            .range([barChartMargin.left, barChartWidth - barChartMargin.right])
            .padding(0.1);

        const yBarScale = d3.scaleLinear()
            .domain([0, d3.max(countryData, d => +d.Temperature)])
            .nice()
            .range([barChartHeight - barChartMargin.bottom, barChartMargin.top]);

        // Create axes for the bar chart
        const xBarAxis = d3.axisBottom(xBarScale).tickFormat(d => d.length > 10 ? d.slice(0, 10) + '...' : d);
        const yBarAxis = d3.axisLeft(yBarScale);

        // Append axes to the bar chart SVG
        const barSvg = d3.select("#bar-chart")
            .append("svg")
            .attr("width", barChartWidth)
            .attr("height", barChartHeight);

        barSvg.append("g")
            .attr("transform", `translate(0,${barChartHeight - barChartMargin.bottom})`)
            .call(xBarAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        barSvg.append("g")
            .attr("transform", `translate(${barChartMargin.left},0)`)
            .call(yBarAxis);

        // Create bars for the bar chart
        barSvg.append("g")
            .selectAll("rect")
            .data(countryData)
            .enter().append("rect")
            .attr("x", d => xBarScale(d["City/state"]))
            .attr("y", d => yBarScale(+d.Temperature))
            .attr("width", xBarScale.bandwidth())
            .attr("height", d => barChartHeight - barChartMargin.bottom - yBarScale(+d.Temperature))
            .attr("fill", "steelblue")
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip.html(`<strong>${d["City/state"]}</strong><br>Temperature: ${d.Temperature}°C`)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition().duration(500).style("opacity", 0);
            });

        // Add title to the bar chart
        barSvg.append("text")
            .attr("x", barChartWidth / 2)
            .attr("y", barChartMargin.top)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("text-decoration", "underline")
            .text(`Average Temperature in Cities/States of ${country}`);

        // Add X axis label to the bar chart
        barSvg.append("text")
            .attr("x", barChartWidth / 2)
            .attr("y", barChartHeight - barChartMargin.bottom / 2 + 40)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("City/State");

        // Add Y axis label to the bar chart
        barSvg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", barChartMargin.left / 2 - 20)
            .attr("x", -barChartHeight / 2)
            .attr("dy", "-1em")
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Average Temperature (°C)");

        // Hide the map and legend, and show the country map and bar chart container
        d3.select("#map").style("display", "none");
        d3.select("#legend-container").style("display", "none");
        d3.select("#country-map-container").style("display", "block");
        d3.select("#bar-chart-container").style("display", "block");
    }
}).catch(error => {
    console.error(error);
});
