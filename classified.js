function classified(data, selector) {

    var metrics = [
        {"title": "Accuracy", "subtitle": "(TP + TN) / (P + N)"},
        {"title": "Precision", "subtitle": "TP / (TP + FP)"},
        {"title": "Recall", "subtitle": "TP / (TP + FN)"},
        {"title": "Specificity", "subtitle": "TN / (TN + FP)"},
    ];

    var margin = {
        top: 20, right: 20, middle: 10, bottom: 20, left: 20
    }, radius = 8,
    legend_width = 80, dots_height = 50, dots_width = 400,
    bar_height = 28, bars_height = metrics.length * bar_height,
    width = legend_width + dots_width + margin.left + margin.right,
    height = dots_height + bars_height + margin.top + margin.bottom + margin.middle;

    data.sort()
    if (selector === undefined) {
        var svg = d3.select("body").append("svg")
            .attr("width", width).attr("height", height).append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    } else {
        var svg = d3.select(selector)
            .attr("width", width).attr("height", height).append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    };

    var x = d3.scale.linear().range([0, dots_width]);
    var y = d3.scale.linear().range([dots_height, 0]);

    x.domain(d3.extent(data, function(d) {return d[0];})).nice();
    y.domain(d3.extent(data, function(d) {return d[1];}));

    var xAxis = d3.svg.axis().scale(x).tickSize(4, -4).orient("bottom");

    var dots = svg.append("g").attr("class", "dots")
        .attr("transform", "translate(" + legend_width + ",0)")
        .attr("width", dots_width).attr("height", dots_height);

    dots.append("line").attr("class", "yline")
        .style("stroke", "black").style("stroke-linecap", "butt")
        .style("stroke-dasharray", "5,5")
        .attr("x1", 0).attr("x2", 0)
        .attr("y1", - radius).attr("y2", dots_height + radius);

    dots.append("g").selectAll(".dot").data(data)
        .enter().append("circle").attr("class", "dot").attr("r", radius)
        .attr("cx", function(d) {return x(d[0]);})
        .attr("cy", function(d) {return y(d[1]);})
        .attr("proba", function(d) {return d[0];})
        .attr("label", function(d) {return d[1];})
        .on("mouseover", function() {update(d3.select(this).style("stroke-width", 4).attr("proba"));})
        .on("mouseout", function() {d3.select(this).style("stroke-width", 0)});

    dots.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + dots_height / 2 * .9 + ")")
        .call(xAxis)
        .append("text").attr("class", "label")
        .attr("x", -10).attr("y", -6)
        .text("Probability");

    // Scatter plot legend
    svg.append("g").selectAll(".legend")
        .data(['TP', 'FN', 'TN', 'FP'])
        .enter().append("g").attr("class", "legend")
        .attr("transform", function(d, i) {return "translate(5," + (i * 16) + ")";})
        .append("circle").attr("cx", 0).attr("r", 6)
        .attr("class", function(d) {return d.toLowerCase();});

    // Metrics legend
    var mtr = svg.append("g")
        .attr("transform", "translate(0," + (dots_height + margin.top) + ")");

    mtr.selectAll(".metric").data(metrics).enter()
        .append("g").attr("class", "metric")
        .append("text").attr("class", "title")
        .attr("x", legend_width - 10)
        .attr("y", function (d, i) { return i * bar_height + margin.middle })
        .text(function (d) { return d.title; });

    mtr.selectAll(".metric")
        .append("text")
        .attr("class", "subtitle")
        .attr("x", legend_width - 10)
        .attr("y", function (d, i) { return i * bar_height + 12 + margin.middle })
        .text(function (d) { return d.subtitle; });

    // Metrics grid background
    var mbg = svg.append("g")
        .attr("transform", "translate(" + legend_width + "," + (dots_height + margin.top) + ")")
        .selectAll(".mbg").data(metrics).enter()
        .append("rect").attr("class", "mbg")
        .attr("width", dots_width).attr("height", bar_height - 4)
        .attr("x", 0).attr("y", function (d, i) { return i * bar_height });

    // Metrics grid axis
    var bx = d3.scale.linear()
        .domain([0, 1.0])
        .range([0, dots_width]);

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(" + legend_width + "," + (margin.top + dots_height + bars_height) + ")")
        .call(d3.svg.axis().scale(bx).ticks(20).tickSize(-bars_height))
        .selectAll(".tick").data(bx.ticks(10), function(d) {return d;})
        .exit().classed("minor",  true);

    svg.append("g")
        .attr("class", "metrics axis")
        .attr("transform", "translate(" + legend_width + "," + (dots_height + 12 + bars_height) + ")")
        .call(d3.svg.axis().scale(bx).ticks(10));

    // Metrics bars
    var mbar = svg.append("g")
        .attr("transform", "translate(" + legend_width + "," + (dots_height + margin.top) + ")")
        .selectAll(".mbar").data(metrics).enter()
        .append("rect").attr("class", "mbar")
        .attr("metric", function (d) { return d.title})
        .attr("width", dots_width).attr("height", 8)
        .attr("x", 0).attr("y", function (d, i) { return i * bar_height + (bar_height - 12) / 2  });

    var measures = {"Accuracy": 1, "Precision": 1, "Recall": 1, "Specificity": 1};
    function update(threshold) {
        var counts = {'tp': 0, 'fp': 0, 'tn': 0, 'fn': 0};
        svg.selectAll(".dot")
        .attr("class", function() {
            var d = d3.select(this);
            var label = d.attr("label");
            var pred = (d.attr("proba") >= threshold) + 0;
            var what = ["f", "t"][(pred == label) + 0] + ["n", "p"][pred];
            counts[what] += 1;
            return "dot " + what + " " + ["neg", "pos"][label];
        });
        svg.select(".yline").transition(500).attr("x1", x(threshold)).attr("x2", x(threshold));

        svg.selectAll(".legend text").remove();
        svg.selectAll(".legend").append("text").attr("x", 10)
        .attr("y", -0.5)
        .attr("dy", ".35em")
        .text(function(d) {return d + " (" + counts[d.toLowerCase()] + ")";});

        var tp = counts["tp"], fp = counts["fp"], tn = counts["tn"], fn = counts["fn"];

        measures.Accuracy = ((tp + tn) / data.length);
        measures.Precision = (tp / (tp + fp));
        measures.Recall = (tp / (tp + fn));
        measures.Specificity = (tn / (tn + fp));

        svg.selectAll(".mbar").transition()
        .duration(500)
        .attr("width", function() {
            var bar = d3.select(this);
            return bx(measures[bar.attr("metric")]);
        });
    };

    update(data[d3.sum(data, function(e) {return e[1] < 1})][0]);
}
