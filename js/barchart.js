function barchart() {

  // Define dimensions and margins for the chart
  const margin = { top: 20, right: 10, bottom: 30, left: 40 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;
  let dispatcher;


  function chart(selector, colorScale, data) {
  
    // Create an SVG element
    const svg = d3.select(selector)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Define your scales (x and y scales)
    const x = d3.scaleBand().rangeRound([0, width]).padding(.00001);
    const y = d3.scaleLinear().rangeRound([height, 0]);
    const xAxis = d3.axisBottom().scale(x);
    const yAxis = d3.axisLeft().scale(y).ticks(10);
    
    const brush = d3.brushX()
            .extent([[0, 0], [width, height]])
            .on("end", brushed);

            const brushG = svg.append("g")
                .attr("class", "brush")
                .call(brush);
            

    function brushed() {
        const event = d3.event;
        if (!event || !event.selection) return;
    
        const [x0, x1] = event.selection;
    
        // Calculate the domain values based on the selection extent
        const xDomain = x.domain().filter((d, i) => {
            const xPos = x(d['Record Date']); // Use x scale for the 'Record Date'
            return xPos >= x0 && xPos <= x1;
        });
    
        // Filter data within the brushed range
        const brushedData = data.filter(d => {
            const recordYear = d['Record Date'].getFullYear();
            return xDomain.includes(recordYear);
        });
    
        let dispatchString = Object.getOwnPropertyNames(dispatcher._)[0];
        dispatcher.call(dispatchString, this, brushedData);

    }
    

    updateChart(data)

    // Function to update the chart based on data
    function updateChart(data) {
        svg.selectAll("*:not(.brush)").remove();
      // Update domains for x and y scales based on data
      const parseTime = d3.timeParse("%a %b %d %Y %H:%M:%S GMT%Z");
      data = data.filter(d => d["Agency Name"] !== "Total");
      data = data.filter(d => !isNaN(d['Gross Cost (in Billions)']));
      data = data.filter(d => d['Gross Cost (in Billions)'] >= 0);
      data.forEach(d => {
        if (d['Record Date'] && parseTime(d['Record Date'])) {
          d['Record Date'] = parseTime(d['Record Date']);
          d['Gross Cost (in Billions)'] = parseFloat(d['Gross Cost (in Billions)']);
        } 
      });
  
      // Extract unique years from data
      const uniqueYears = Array.from(new Set(data.map(d => d['Record Date'].getFullYear())));
  
      // Group data by year and then by department
      const nestedData = d3.group(data, d => d['Record Date'].getFullYear());
  
      // Extract unique departments from data
      const uniqueDepartments = Array.from(new Set(data.map(d => d['Department'])));
  
      uniqueYears.reverse();

      // Update the x-axis domain with unique years
      x.domain(uniqueYears);
      y.domain([0, d3.max(data, d => +d['Gross Cost (in Billions)'])]);
  
  
      // Draw X axis with ticks for each unique year
      svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis.tickValues(uniqueYears))
        .selectAll(".tick text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
  
      // Draw Y axis with updated scale
      svg.append("g")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end")
        .text("Gross Cost (in Billions)");
  
        svg.selectAll(".year-group")
        .data(Array.from(nestedData))
        .enter()
        .append("g")
        .attr("class", "year-group")
        .attr("transform", d => `translate(${x(d[0])},0)`)
        .each(function (d) {
          const barsInYear = d[1].length;
          const barWidth = x.bandwidth() / (barsInYear * uniqueDepartments.length + 1);
          const gap = barWidth;
        
        uniqueDepartments.forEach((department, i) => {
            const barsForDepartment = d[1].filter(item => item['Department'] === department);
            
            d3.select(this)
                .selectAll(".bar")
                .data(barsForDepartment)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", (item, j) => x(item['Record Date'].getFullYear()) + gap + (i * (barsInYear * barWidth + gap)) + (j * (barWidth + gap)))
                .attr("y", item => y(+item['Gross Cost (in Billions)']))
                .attr("height", item => height - y(+item['Gross Cost (in Billions)']))
                .attr("width", barWidth)
                .style("fill", item => colorScale(item['Agency Name']))
                .append("title")  // Add a title element for the tooltip
                .text(item => `Department: ${item['Agency Name']}\nGross Cost: ${item['Gross Cost (in Billions)']} Billion`);
        });
    });


    }
    
    chart.updateChart = updateChart;
  
    // Return the function to update the chart
    return chart;
  }

  chart.selectionDispatcher = function (_) {
    if (!arguments.length) return dispatcher;
    dispatcher = _;
    return chart;
  };

  chart.updateSelection = function (selectedData) {
    if (!arguments.length) return;
    data = selectedData;
    const uniqueDepartments = Array.from(new Set(data.map(d => d['Department'])));

// Calculate the number of unique departments
const numUniqueDepartments = uniqueDepartments.length;

// Define an array to hold the chunks of data
const newDataArray = [];

// Loop to create chunks of data and skip the next chunk
for (let i = 0; i < data.length; i += numUniqueDepartments * 2) {
    // Get a chunk of data equal to the number of unique departments
    const chunk = data.slice(i, i + numUniqueDepartments);
    
    // Append the chunk to the new array
    newDataArray.push(...chunk);
}
    

    chart.updateChart(newDataArray)
  };

  return chart;
}
