
function Classified(data, options) {
    this.parseOptions(options || {});
    this.svg = (this.select ? d3.select(this.select) : d3.select("body").append("svg"))

    if (!this.svg[0][0]) {
        alert(this.select + " did not select anything.");
        return;

    } else if (this.svg[0][0].nodeName.toLowerCase() != "svg") {
        alert(this.select + " did not select an SVG element.");
        return;
    }
    this.svg.attr("width", this.width).attr("height", this.height);

    this._locked = true;
    this._onlock = new Array();
    this._onunlock = new Array();
    this._onmove = new Array();
    this._onmoved = new Array();
    this.tp = 0;
    this.fp = 0;
    this.tn = 0;
    this.fn = 0;
    this.prepData(data);
    this.show();
}
Classified.prototype.parseOptions = function(options) {
    this.width = options.width || 600;
    this.height = options.height || 500;
    if (this.height < 400) { this.height = 400; }
    if (this.width < 400) { this.width = 400; }
    this.radius = (options.radius || 5);
    this.margin = (options.margin || 10);
    this.bars_height = 300;
    this.dots_height = this.height - this.bars_height - this.margin * 2;
    this.dots_width = this.width - this.margin * 2;
    this.select = options.select;
    this.sparklines = (options.sparklines ||
        ["accuracy", "precision", "recall", "specificity", "f1score",
         "missrate", "fallout"]);
    //this.layout = (options.layout || "dots;dots,dots;dots,dots,dots")
    this.layout = (options.layout || "dots;dots,dots")

};

Classified.prototype.show = function() {

    var height = this.height, width = this.width, margin = this.margin,
        layout = this.layout,
        cols, rows = layout.split(";"),
        w, h = (height - margin * (1 + rows.length)) / rows.length,
        x, y, i, j,
        g, svg = this.svg,
        col, method;

    for (i = 0; i < rows.length; i++) {
        cols = rows[i].split(',');
        w = (width - margin * (1 + cols.length)) / cols.length;
        y = margin + (margin + h) * i;
        for (j = 0; j < cols.length; j++){
            col = cols[j].toLowerCase();
            console.log([col, h, w])

            x = margin + (margin + w) * j;
            g = svg.append("g")
                .attr("transform", "translate(" + x + "," + y + ")");
            method = 'show' + col.substr(0, 1).toUpperCase() + col.substr(1);
            console.log(method);
            this[method](g, h, w);
        }

    }

    //this.showDots();
    //this.showLines();
    //this.showGrid();
};


Classified.prototype.prepData = function(data) {

    var dots = [], dot, n_pos = 0,
        arr = Object.prototype.toString.call(data[0]) === '[object Array]';

    var truth = function(t) {
        // Return true if prediction is correct.
        return (this.proba > t) ? this.label : !this.label;
    };
    var tc = function(t) {
        // Return truth of prediction and class, e.g. tp for true positive
        return (this.proba > t) ?
            (this.label ? "tp" : "fp") : (this.label ? "fn" : "tn");
    };
    var c = this;
    var show = function(t) {
        var tc = this.tc(t);
        if (!this.shown) {
            c[tc]++;
        }
        this.shown = true;
        return tc;
    }
    var paint = function(t) {
        var new_class = this.tc(t), dot = d3.selectAll(this.circles);

        c[dot.attr("tc")]--;
        c[new_class]++;
        dot.attr('tc', new_class)
            .attr("class", "dot " + new_class);
    };

    for (var i = 0; i < data.length; i++) {
        if (arr) {dot = {'proba': data[i][0], 'label': data[i][1] > 0};}
        else {dot = data[i];}
        dot.truth = truth;
        dot.circles = new Array();
        dot.tc = tc;
        dot.show = show;
        dot.paint = paint;
        n_pos += dot.label;
        dots.push(dot);
    }
    dots.sort(function (a, b) {return a.proba - b.proba;});
    dots.map(function (d, i) {d.index = i;});


    this.size = data.length;
    this.data = dots;
    this.n_pos = n_pos;
    this.n_neg = this.size - n_pos;
    this.t_idx = this.n_neg;
    this.p_max = dots[this.size - 1].proba;
    this.p_min = dots[0].proba;
    var prev = dots[0].proba, diff = 0, min_diff = 1;
    for (var i = 0; i < this.size; i++) {
        diff = dots[i].proba - prev
        if (diff > 0 & diff < min_diff) {
            min_diff = diff;
        }
    }
    this.min_diff = min_diff;
};
Classified.prototype.profile = function() {

    var metrics = [
        {"title": "Accuracy", "subtitle": "(TP + TN) / (P + N)"},
        {"title": "Precision", "subtitle": "TP / (TP + FP)"},
        {"title": "Recall (Sensitivity)", "subtitle": "TP / (TP + FN)"},
        {"title": "Specificity (TNR)", "subtitle": "TN / (TN + FP)"},
        {"title": "F1 score", "subtitle": "TN / (TN + FP)"},
        {"title": "Miss rate (FNR)", "subtitle": "FN / P"},
        {"title": "Fall-out (FPR)", "subtitle": "FP / N"}
    ];

    var d, i, data = this.data, size = this.size, n_pos = this.n_pos, n_neg = this.n_neg,
        t = n_pos, tp = n_pos, above = size, tn = 0, fn = 0;
    for (i = 0; i < size; i++) {
        above = size - i;
        d = data[i];
        d.accuracy = t / size;
        d.precision = tp / above;
        d.recall = tp / n_pos;
        d.missrate = fn / n_pos;
        d.fallout = tn / n_neg;
        if (i) {d.specificity = tn / i};
        d.f1score = 2 * d.precision * d.recall / (d.precision + d.recall);
        //console.log([tn, tp, above]);
        //console.log([d.accuracy, d.precision, d.recall]);
        t = t + (d.label ? -1 : 1);
        tp = tp - d.label;
        tn = tn + (1 - d.label);
        fn = fn + d.label;
    }
    data[0].specificity = data[1].specificity;
};
Classified.prototype.showLines = function() {
    this.profile()

    var data = this.data;

    var margin = this.margin,
        height = margin * 1 + this.dots_height * 1,
        top = margin * 5 + this.dots_height;
    var svg = this.svg;
    this.sparklines.forEach(function(l, i){

        var x = d3.scale.linear().range([0, 100])
            .domain(d3.extent(data, function(d) {return d.proba;})).nice();

        var y = d3.scale.linear().range([30, 0])
            .domain(d3.extent(data, function(d){return d[l]}));

        var line = d3.svg.line()
            .x(function(d) { return x(d.proba); })
            .y(function(d) { return y(d[l]); });


        svg.append("g")
            .attr("class", "dots")
            .attr("transform", "translate(" + margin + "," + (top + i * 30) + ")")
            .append("path")
            .datum(data)
            .attr("class", "aline")
            .attr("d", line);
        //console.log([margin, top, top + (i * 40)]);

    })

};


Classified.prototype.showBars = function(g, h, w) {
};

Classified.prototype.showDots = function(g, h, w) {
    console.log([g, h, w]);

    var c = this, size = this.size, data = this.data;

    // PACK DOTS
    var rows, bottom, radius = this.radius,
        height = h - 20, width = w - 20,
        dist = Math.pow(1. * width * height / size, 0.5);
    dist = Math.min(radius * 2 * 1.1, dist);

    var p2x = d3.scale.linear().range([0, width])
        .domain(d3.extent(data, function(d) {return d.proba;})).nice();
    var x = data.map(function(d){return p2x(d.proba);}),
        y = new Array();
    for (var k = 0; k < 100; k++) {
        bottom = height - dist / 1.1 / 2;
        rows = [];
        for (var i = 0; i < size; i++) {
            for (j = 0; j < rows.length & rows[j] > x[i]; j++) {}
            rows[j] = x[i] + dist;
            y[i] = bottom - (j * dist);
        }
        if (rows.length * dist < bottom) { break; }
        else { dist = dist * .95 }
    }
    radius = (dist) / 1.1 / 2;
    y_max = dist * rows.length;
    x_min = p2x(this.p_min);
    console.log('Distance: ' + dist);
    console.log('Radius: ' + radius);

    // SHOW LEGEND
    var i, bin,
        n = Math.ceil((x[size-1] - x[0]) / dist),
        counts = new Array(n + 1);
    for (i = 0; i < counts.length; i++) {counts[i] = 0};
    for (i = 0; i < size; i++) {
        counts[Math.round((x[i] - x_min) / dist)]++;
    }
    var max = d3.max(counts) - 2, track = 0;
    for (i = counts.length - 1; i >= 0 && track < 8; i--) {
        if (counts[i] < max) {track ++}
        else {track = 0}
    }

    var lx = (i + 4) * dist;
    dist = this.radius * 2 * 1.1;
    var cm = [
        {"class": "tn", "label": "TN", "r": this.radius,
            "cx": lx, "cy": dist * 2,
            "x": lx - this.radius - 2, "y": dist * 2 + this.radius - 1,
            "anchor": "end"},
        {"class": "fn", "label": "FN", "r": this.radius,
            "cx": lx, "cy": dist * 3,
            "x": lx - this.radius - 2, "y": dist * 3 + this.radius - 1,
            "anchor": "end"},
        {"class": "fp", "label": "FP", "r": this.radius,
            "cx": lx + dist, "cy": dist * 2,
            "x": lx + dist + this.radius + 2, "y": dist * 2 + this.radius - 1,
            "anchor": "start"},
        {"class": "tp", "label": "TP", "r": this.radius,
            "cx": lx + dist, "cy": dist * 3,
            "x": lx + dist + this.radius + 2, "y": dist * 3 + this.radius - 1,
            "anchor": "start"}
    ]

    var legend = g.append("g")
        .attr("class", "legend")
        .selectAll(".legend").data(cm)
        .enter();
    legend.append("circle")
        .attr("r", function(d) {return d.r})
        .attr("cx", function(d) {return d.cx})
        .attr("cy", function(d) {return d.cy})
        .attr("class", function(d) {return d.class;})
        .on("mouseover", function(d) { console.log(d) })
        .on("mouseout", function(d) { console.log(d) });

    legend.append("text")
        .attr("x", function(d) {return d.x})
        .attr("y", function(d) {return d.y})
        .style("text-anchor", function(d) {return d.anchor} )
        .text(function(d) {return d.label;});

    var sel = g.selectAll('.legend text')[0];
    legend = {"tn": cm[0], "fn": cm[1], "fp": cm[2], "tp": cm[3]};
    legend["tn"]["text"] = d3.select(sel[0]);
    legend["fn"]["text"] = d3.select(sel[1]);
    legend["fp"]["text"] = d3.select(sel[2]);
    legend["tp"]["text"] = d3.select(sel[3]);

    var updateLegend = function(p) {
        legend["tp"].text.text("TP (" + c.tp + ")");
        legend["fp"].text.text("FP (" + c.fp + ")");
        legend["fn"].text.text("(" + c.fn + ") FN");
        legend["tn"].text.text("(" + c.tn + ") TN");
    }
    this._onmoved.push(updateLegend);


    // SHOW DOTS
    var duration = 1000, delay = duration / size;
    var xAxis = d3.svg.axis().scale(p2x).orient("bottom");

    g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + 10 + "," + (h - 20 + 1) + ")")
        .call(xAxis);
        //.append("text").attr("class", "label")
        //.attr("x", -10).attr("y", -6)
        //.text("Probability");

    var t = data[this.n_neg].proba;
    this.threshold = t;
    var threshold = p2x(t), origin = h - y_max;
    //for (var i = 0; i < this.size; i++) {
    //    this[this.data[i].tc(t)] += 1;
    //}

    g.append("g")
        .attr("class", "dots")
        .attr("transform", "translate(" + 10 + ",0)")
        .selectAll(".dot").data(data)
        .enter().append("circle")
        .attr("r", 0)
        .attr("cx", function(d) {return legend[d.tc(t)].cx})
        .attr("cy", function(d) {return legend[d.tc(t)].cy})
        .attr("class", function(d) {return "dot " + d.tc(t);})
        .attr("tc", function(d) {return d.tc(t);})
        .transition()
        .duration(100)
        .delay(function(d, i) {
            var ms = i * delay;
            setTimeout(function(){d.show(t); updateLegend()}, ms);
            return ms})
        .attr("r", radius)
        .attr("cx", function(d) {return x[d.index];})
        .attr("cy", function(d) {return y[d.index];})

    g.selectAll('circle.dot')[0].map(function(c, i) {
        data[i].circles.push(c);
    });

    var yline = g.append("g")
        .attr("class", "tline")
        //.attr("transform", "translate(" + this.margin + "," + this.margin + ")")
        .append("line")
        .style("display", "none")
        .style("stroke", "red")
        .style("stroke-linecap", "butt")
        .style("stroke-dasharray", "2,3")
        .attr("x1", threshold).attr("x2", threshold)
        .attr("y1", origin)
        .attr("y2", h - 20 + 1.5);

    var pmark = g.append("g")
        .attr("class", "tmark")
        //.attr("transform", "translate(" + this.margin + "," + this.margin + ")")
        .append("circle")
        .style("fill", "black")
        .attr("r", radius / 2)
        .attr("cx", threshold)
        .attr("cy", h - 20 + 1.5);

    this._onlock.push(function() {
        yline.style("display", "none");
        pmark.style("fill", "black");
    });
    this._onunlock.push(function() {
        //yline.style("display", null);
        pmark.style("fill", "red");
    });
    this._onmove.push(function(p){
        var threshold = p;
        pmark.attr("cx", 10 + p2x(p));
        if (Math.abs(threshold - c.threshold) < c.min_diff){
            return;
        }
        //if (threshold > c.data[c.size]){threshold = c.data[c.size].proba}
        //if (threshold < c.data[0]){threshold = c.data[0].proba}

        //console.log([threshold, c.threshold, c.t_idx]);

        var previous = c.threshold;
        c.threshold = threshold;
        if (threshold > previous) {
            for (i = c.t_idx; i < size && data[i].proba < threshold ; i++) {
                data[i].paint(threshold);
            }
        } else {
            for (i = c.t_idx; i >= 0 && data[i].proba > threshold ; i--) {
                data[i].paint(threshold);
            }
        }
        if (i < 0) { c.t_idx = 0; }
        else if (i >= size) { c.t_idx = size - 1; }
        else { c.t_idx = i; }

    });


    this._overlay = g.append("rect")
        .attr("transform", "translate(" + 10 + ",0)")
        .attr("class", "overlay")
        .attr("width", w - 20)
        .attr("height", h - 20)
        .on("mouseover", function() { if (c.isLocked()) {return}; yline.style("display", null); })
        .on("mouseout", function() { if (c.isLocked()) {return}; yline.style("display", "none"); })
        .on("click", function() { c.toggle(); c._mousemove(d3.mouse(this));})
        .on("mousemove", function() {
            if (c.isLocked()) {return};
            yline.style("display", null);
            var xy = d3.mouse(this);
            c.update(p2x.invert(xy[0]));
            yline.attr("x1", 10 + xy[0]).attr("x2", 10 + xy[0]).attr("y1", xy[1]);
        });

    setTimeout(function() {c.unlock()}, duration + 100);
};

Classified.prototype.showMetric = function() {
};
Classified.prototype.showROCCurve = function() {
};
Classified.prototype.showGrid = function() {
    var margin = this.margin,
        height = margin * 1 + this.dots_height * 1,
        top = margin * 1;
    this.svg.append("g")
        .attr("class", "dots")
        .attr("transform", "translate(" + margin + "," + top + ")")
        .append("rect")
        .attr("class", "grid-background")
        .attr("width", this.dots_width)
        .attr("height", this.dots_height);

    this.svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(" + margin + "," + height + ")")
        .call(d3.svg.axis().scale(this.p2x)
        .ticks(20).tickSize(-this.dots_height))
        .selectAll(".tick")
        .data(this.p2x.ticks(10), function(d) { return d; })
        .exit()
        .classed("minor", true);
    return;
    this.svg.append("g")
        .attr("class", "axis2")
        .attr("transform", "translate(" + margin + "," + height + ")")
        .call(d3.svg.axis().scale(this.p2x).ticks(10));
};

Classified.prototype.lock = function() {
    this._locked = true;
    for (var i = 0; i < this._onlock.length; i++) {
        this._onlock[i]();
    }
};
Classified.prototype.unlock = function() {
    this._locked = false;
    for (var i = 0; i < this._onunlock.length; i++) {
        this._onunlock[i]();
    }
};
Classified.prototype.update = function(p) {
    //console.log('Update: ' + p)
    for (var i = 0; i < this._onmove.length; i++) {
        this._onmove[i](p);
    }
    for (var i = 0; i < this._onmoved.length; i++) {
        this._onmoved[i](p);
    }
};

Classified.prototype.toggle = function() {
    if (this._locked) {this.unlock();}
    else {this.lock()};
};
Classified.prototype.isLocked = function() {
    return this._locked;
}
