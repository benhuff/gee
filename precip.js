var table = table 

Map.centerObject(table, 5);
Map.addLayer(table, {}, 'Lower Mekong basin');

// Set start and end years.
var startYear = 1987;
var endYear = 2015;

// Create two date objects for start and end years.
var startDate = ee.Date.fromYMD(startYear, 1, 1);
var endDate = ee.Date.fromYMD(endYear + 1, 1, 1);

// Make a list with years.
var years = ee.List.sequence(startYear, endYear);

// Make a list with months.
var months = ee.List.sequence(1, 12);

// Import the CHIRPS dataset.
var CHIRPS = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD');

// Filter for the relevant time period.
CHIRPS = CHIRPS.filterDate(startDate, endDate);

var scale = CHIRPS.select('precipitation').first().projection().nominalScale().getInfo();

var climatology = ee.ImageCollection.fromImages(
    years.map(function(y) {
        return months.map(function(m) {
            var w = CHIRPS.filter(ee.Filter
                    .calendarRange(y, y, 'year'))
                .filter(ee.Filter.calendarRange(m, m,
                    'month'))
                .sum();
            return w.set('year', y)
                .set('month', m)
                .set('system:time_start', ee.Date
                    .fromYMD(y, m, 1));

        });
    }).flatten()
);

var monthlyMean = ee.ImageCollection.fromImages(
    months.map(function(m) {
      var w = climatology.filter(ee.Filter.eq('month', m))
          .mean();
      return w.set('month', m);
    })  
);

print(monthlyMean);

var chartMeans = ui.Chart.image.seriesByRegion({
        imageCollection: monthlyMean,
        regions: table,
        reducer: ee.Reducer.mean(),
        band: 'precipitation',
        scale: scale,
        xProperty: 'month',
        seriesProperty: 'ADM1_EN'
    })
    .setOptions(title)
    .setChartType('LineChart');

// Print the chart.
print(chartMeans);

// Set start and end years.
var startYear = 2015;
var endYear = 2020;

// Create two date objects for start and end years.
var startDate = ee.Date.fromYMD(startYear, 1, 1);
var endDate = ee.Date.fromYMD(endYear + 1, 1, 1);

// Make a list with years.
var years = ee.List.sequence(startYear, endYear);

// Make a list with months.
var months = ee.List.sequence(1, 12);

// Import the CHIRPS dataset.
var CHIRPS = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD');

// Filter for the relevant time period.
CHIRPS = CHIRPS.filterDate(startDate, endDate);

var scale = CHIRPS.select('precipitation').first().projection().nominalScale().getInfo();

// We apply a nested loop where we first map over 
// the relevant years and then map over the relevant 
// months. The function returns an image with the total (sum)
// rainfall for each month. A flatten is applied to convert a
// feature collection of features into a single feature collection.
var monthlyPrecip = ee.ImageCollection.fromImages(
    years.map(function(y) {
        return months.map(function(m) {
            var clim = climatology.filter(ee.Filter.eq('month', m)).mean().rename('climatology');
            var w = CHIRPS.filter(ee.Filter
                    .calendarRange(y, y, 'year'))
                .filter(ee.Filter.calendarRange(m, m,
                    'month'))
                .sum();
            var anom = w.subtract(clim).rename('anomaly');
            var w2 = w.addBands([clim, anom]);
            return w2.set('year', y)
                .set('month', m)
                .set('system:time_start', ee.Date
                    .fromYMD(y, m, 1));

        });
    }).flatten()
);

// Set the title and axis labels for the chart.
var title = {
    title: 'Monthly precipitation',
    hAxis: {
        title: 'Time'
    },
    vAxis: {
        title: 'Precipitation (mm)'
    },
};

// Plot the chart using the boundary.
var chartMonthly = ui.Chart.image.seriesByRegion({
        imageCollection: monthlyPrecip,
        regions: table,
        reducer: ee.Reducer.mean(),
        band: 'precipitation',
        scale: scale,
        xProperty: 'system:time_start',
        seriesProperty: 'ADM1_EN'
    })
    .setOptions(title)
    .setChartType('LineChart');

// Print the chart.
print(chartMonthly);

// Set the title and axis labels for the chart.
var title = {
    title: 'Monthly precipitation climatology',
    hAxis: {
        title: 'Time'
    },
    vAxis: {
        title: 'Precipitation (mm)'
    },
};
// Plot the chart using the boundary.
var chartMonthly = ui.Chart.image.seriesByRegion({
        imageCollection: monthlyPrecip,
        regions: table,
        reducer: ee.Reducer.mean(),
        band: 'climatology',
        scale: scale,
        xProperty: 'system:time_start',
        seriesProperty: 'ADM1_EN'
    })
    .setOptions(title)
    .setChartType('LineChart');

// Print the chart.
print(chartMonthly);

// Set the title and axis labels for the chart.
var title = {
    title: 'Monthly precipitation anomaly',
    hAxis: {
        title: 'Time'
    },
    vAxis: {
        title: 'Precipitation (mm)'
    },
};
// Plot the chart using the boundary.
var chartMonthly = ui.Chart.image.seriesByRegion({
        imageCollection: monthlyPrecip,
        regions: table,
        reducer: ee.Reducer.mean(),
        band: 'anomaly',
        scale: scale,
        xProperty: 'system:time_start',
        seriesProperty: 'ADM1_EN'
    })
    .setOptions(title)
    .setChartType('LineChart');

// Print the chart.
print(chartMonthly);
