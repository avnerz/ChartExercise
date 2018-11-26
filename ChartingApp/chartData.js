var defaultThreshold = 0;
var defaultNumPoints = 10;
var defaultMaxPoints = 10;

var chartData = new function () {
    var _this = this;
    _this.threshold = defaultThreshold;
    _this.numPoints = defaultNumPoints;
    _this.maxPoints = defaultMaxPoints;

    _this.init = function () {
         viewModel.init(_this.threshold, _this.numPoints, _this.maxPoints, function (changedField) {
            if (changedField == 'threshold') {
                var str = viewModel.threshold();
                if (str && str != "") {
                    var num = parseFloat(str);
                    if (!isNaN(num) && num.toString() == str) {
                        _this.threshold = num;
                    } else {
                        viewModel.threshold("");
                        alert("Invalid numeric input: ".concat(str));
                    }
                    _this.updateChartThreshold();
                }
            } else if (changedField == 'numPoints') {
                _this.numPoints = viewModel.numPoints();
                _this.updateChartData();
            }
        });
 
        window.onload = function () {
            console.log('windows.onload');
            _this.chart = new CanvasJS.Chart('chartContainer', _this.generateChartOptions());
            _this.chart.render();
            _this.loadDataSet();
         }

        window.onerror = function (msg, url, line) {
            alert('Error occured: '.concat(msg));
            return false;
        }
    };

    _this.updateChartData = function () {
        if (_this.loaded) {
            _this.chart.options = _this.generateChartOptions();
            _this.chart.render();
        }
    };

    _this.updateChartThreshold = function () {
        if (_this.loaded) {
            _this.chart.options.axisY.stripLines[0].value = _this.threshold;
            _this.setThresholdMarks(_this.chart.options.data[0].dataPoints, _this.threshold);
            _this.chart.render();
        }
    };

    _this.setThresholdMarks = function (dataPoints, threshold) {
        $.each(dataPoints, function (i, val) {
            val.color = (threshold != undefined && val.y >= threshold) ? "Red" : "Blue";
        });
    }

    _this.generateChartOptions = function () {
        var title = "Stock Prices";
        var loading = !_this.stockData;
        var dataPoints = loading ? [] : _this.stockData.slice(0, Math.min(_this.stockData.length, _this.numPoints));
        var minY, maxY;

        dataPoints = $.map(dataPoints, function (point) {
            var y = Number(point.metrics[0].value);
            minY = minY != undefined ? Math.min(minY, y) : y;
            maxY = maxY != undefined ? Math.max(maxY, y) : y;
            return { x: point.time, y: y };
        });
        _this.setThresholdMarks(dataPoints, _this.threshold);
        return {
            title: {
                text: _this.error ? title.concat(' (', _this.error, ')') : (loading ? title.concat(' (loading...)') :  title),
                fontSize: "18",
                fontFamily: "Ariel",
                horizontalAlign: "left"
            },
            axisX: {
                valueFormatString: "hh:mm TT"
            },
            axisY: {
                stripLines: loading || _this.threshold == undefined ? [] : [
                    {
                        value: _this.threshold,
                        color: "#ff0000",
                        lineDashType: "longDash"
                    }
                ],
                valueFormatString: "####.##",
                minimum: minY != undefined ? Math.min(minY - 0.1) : undefined,
                maximum: maxY != undefined ? maxY + 0.1 : undefined
            },
            data: [
                {
                    type: "line",
                    color: "#0000ff",
                    dataPoints: dataPoints
                }
            ]
        };
    };

    _this.loadDataSet = function () {
        var callUrl = 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&interval=5min&outputSize=compact&symbol=MSFT&apikey=RNH8BG2AW9W0SAE9';
        $.ajax({
            url: callUrl,
            crossDomain: true,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                try {
                    _this.stockData = _this.transformData(data);
                    _this.loaded = true;
                    _this.error = undefined;
                    _this.chart.options = _this.generateChartOptions();
                    _this.chart.render();
                    viewModel.maxPoints(_this.stockData.length);
                }
                catch (error) {
                    alert("Error retrieving data: ".concat(error.message));
                    _this.error = "failed to load";
                    _this.chart.options = _this.generateChartOptions();
                    _this.chart.render();
                }
            },
            error: function (jqXHR, textStatus, error) {
                alert("Error loading data from network");
                _this.error = "failed to load";
                _this.chart.options = _this.generateChartOptions();
                _this.chart.render();
            }
        });
    };

    _this.transformData = function (rawData, options) {
        function getDateFromString(s) {
            var m = moment(s, 'YYYY-MM-DD HH:mm:ss')
            if (m.isValid()) {
                return m.toDate();
            } else {
                throw new Error("Parsing error", "Invalid date");
            }
        }

        // TODO: error checking
        var timeSeries = rawData["Time Series (5min)"];
        if (!timeSeries)
            throw new Error("Parsing error", "Time series not found in data");

        var items = [];
        for (var x in timeSeries) {
            items.push({ time: x, metrics: timeSeries[x] });
        }
        
        var items = $.map(items, function (item) {
            return {
                time: getDateFromString(item.time), metrics:
                function () {
                    var sortedMetrics = [];
                    for (var x in item.metrics) {
                        sortedMetrics.push({ metric: x, value: item.metrics[x] });
                    }
                    sortedMetrics.sort();
                    return sortedMetrics;
                }()
            };
        });

        items.sort(function (a, b) {
            var aNum = a.time.getTime(), bNum = b.time.getTime();
            return aNum == bNum ? 0 : (aNum > bNum ? 1 : -1);
        });

        return items;
    };

    return _this;
}();
