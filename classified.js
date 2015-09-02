
function Classified(data, options) {
    this.parseOptions(options || {});
    this.prepData(data);
    this.packCircles();
    this.svg = d3.select(this.selector)
        //.style("background-color", "lightgray")
        .attr("width", this.width).attr("height", this.height);

    this.showCircles();
}
Classified.prototype.parseOptions = function(options) {
    this.width = options.width || 600;
    this.height = options.height || 500;
    if (this.height < 400) { this.height = 400; }
    this.radius = 5;
    this.margin = 10;
    this.bars_height = 300;
    this.dots_height = this.height - this.bars_height;
    this.dots_width = this.width - this.margin * 2;
    this.selector = options.selector;
};
Classified.prototype.prepData = function(data) {

    var dots = [], d, dot, n_pos = 0;

    var klass = function(t) {
        return (this.proba > t) ? (this.label ? "tp" : "fp") : (this.label ? "fn" : "tn")
    };
    for (var i = 0; i < data.length; i++) {
        d = data[i];
        dot = {'proba': d[0], 'label': d[1] > 0}
        dots.push(dot);
        n_pos += dot.label;
        dot.class = klass;
    }
    dots.sort(function (a, b) { return a.proba - b.proba; });

    this.size = dots.length;
    this.data = dots;
    this.n_pos = n_pos;
    this.n_neg = this.size - n_pos;
    this.dot_index = this.n_neg;
};

Classified.prototype.packCircles = function() {

    var rows = [], data = this.data,
        dist = Math.min(this.radius * 2 * 1.1,
            Math.pow(1. * this.dots_width * this.dots_height / this.size, 0.5));

    this.dots_x = d3.scale.linear().range([0, this.dots_width])
        .domain(d3.extent(data, function(d) {return d.proba;})).nice();

    var dots_x = this.dots_x;

    for (var i = 0; i < this.size; i++) {
        data[i].x = dots_x(data[i].proba);
        data[i].index = i;
    }

    var prev = dist / 2;
    for (var k = 0; k < 100; k++) {
        var bottom = this.dots_height - dist / 1.1 / 2;
        console.log('Distance ' + dist);
        rows = [];
        for (var i = 0; i < this.size; i++) {
            for (j = 0; j < rows.length & rows[j] > data[i].x; j++) {}
            rows[j] = data[i].x + dist;
            data[i].y = bottom - (j * dist);
        }
        if (rows.length * dist > bottom) {
            dist = dist * .95;
        } else {
            break;
        }
    }

    var prev = dist / 2;
    for (var k = 1000; k < 1000; k++) {
        var bottom = this.dots_height - dist / 1.0 / 2;
        console.log('Distance ' + dist);
        rows = [];
        for (var i = 0; i < this.size; i++) {
            for (j = 0; j < rows.length & rows[j] > data[i].x; j++) {}
            rows[j] = data[i].x + dist;
            data[i].y = bottom - (j * dist);
        }
        if ( ! (0 < rows.length * dist - bottom < 1)) {
            var temp = (dist + prev) / 2;
            prev = dist;
            dist = temp;
        } else {
            break;
        }
    }

    this.radius = (dist) / 1.1 / 2;
    this.dots_y_max = dist * rows.length;
    console.log('Distance: ' + dist);
    console.log('Radius: ' + this.radius);

};

Classified.prototype.showCircles = function() {

    var delay = 2000 / this.size;

    var xAxis = d3.svg.axis().scale(this.dots_x).orient("bottom")   ;

    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + this.margin + "," + (this.dots_height + this.margin + 1) + ")")
        .call(xAxis);
        //.append("text").attr("class", "label")
        //.attr("x", -10).attr("y", -6)
        //.text("Probability");

    var t = this.data[this.n_neg].proba;
    this.threshold = t;
    var threshold = this.dots_x(this.threshold),
        origin = this.dots_height - this.dots_y_max,
        dots_y_max = this.dots_y_max,
        size = this.size;


    this.yline = this.svg.append("g")
        .attr("transform", "translate(" + this.margin + "," + this.margin + ")")
        .append("line").attr("class", "yline")
        .style("stroke", "black").style("stroke-linecap", "butt")
        .style("stroke-dasharray", "5,5")
        .attr("x1", threshold).attr("x2", threshold)
        .attr("y1", origin)
        .attr("y2", this.dots_height + this.radius);


    this.svg.append("g")
        .attr("transform", "translate(" + this.margin + "," + this.margin + ")")
        .selectAll(".dot").data(this.data)
        .enter().append("circle")
        .attr("r", 0)
        .attr("cx", threshold)
        .attr("cy", function(d, i) {return dots_y_max - dots_y_max * i / size})
        .attr("class", function(d) {return "dot " + d.class(t);})
        .transition()
        .duration(100)
        .delay(function(d, i) {return i * delay})
        .attr("r", this.radius)
        .attr("cx", function(d) {return d.x;})
        .attr("cy", function(d) {return d.y;})

    var circles = this.svg.selectAll('circle.dot')[0];
    this.circles = circles;

    var paint = function(t) {d3.select(circles[this.index]).attr("class", "dot " + this.class(t))}
    ;
    var prev = this.data[0].proba, diff = 0, min_diff = 1;
    for (var i = 0; i < this.size; i++) {
        this.data[i].paint = paint;
        diff = this.data[i].proba - prev
        if (diff > 0 & diff < min_diff) {
            min_diff = diff;
        }
    }
    this.min_diff = min_diff;

    var focus = this.svg.append("g").attr("class", "focus").style("display", "none");
    var c = this;
    this.overlay = this.svg.append("rect")
        .attr("transform", "translate(" + this.margin + "," + this.margin + ")")
        .attr("class", "overlay")
        .attr("width", this.dots_width)
        .attr("height", this.dots_height)
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); })
        .on("mousemove", function() {
            c.updateCircles(c.dots_x.invert(d3.mouse(this)[0]));
        });

};
Classified.prototype.updateCircles = function(threshold) {
    if (Math.abs(threshold - this.threshold) < this.min_diff){
        return;
    }
    //if (threshold > this.data[this.size]){threshold = this.data[this.size].proba}
    //if (threshold < this.data[0]){threshold = this.data[0].proba}

    var data = this.data, size = this.size;
    //console.log([threshold, this.threshold, this.dot_index]);
    this.yline.attr("x1", this.dots_x(threshold)).attr("x2", this.dots_x(threshold));
    var previous = this.threshold;
    this.threshold = threshold;
    if (threshold > previous) {
        for (i = this.dot_index; i < size && data[i].proba < threshold ; i++) {
            data[i].paint(threshold);
        }
    } else {
        for (i = this.dot_index; i >= 0 && data[i].proba > threshold ; i--) {
            data[i].paint(threshold);
        }
    }
    if (i < 0) { this.dot_index = 0; }
    else if (i >= size) { this.dot_index = size - 1; }
    else { this.dot_index = i; }

};
Classified.prototype.showMetric = function() {
};
Classified.prototype.showROCCurve = function() {
};
Classified.prototype.show = function() {
};
Classified.prototype.update = function() {
};

function classified(data, options) {
    return new Classified(data, options);
}
