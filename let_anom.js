var terraclim = ee.ImageCollection("IDAHO_EPSCOR/TERRACLIMATE");
var scale = terraclim.first().projection().nominalScale();

var addMeta = function(image){
  var startObject = image.get('system:time_start');
  var startDate = ee.Date(startObject);
  var startYear = startDate.get('year').format('%04d');
  var startMonth = startDate.get('month').format('%02d');
  return image.set('month',startMonth).set('year',startYear);
};

var terraclim = terraclim.select('tmmx').map(addMeta);
print(terraclim);

var terraclim = terraclim.filter(ee.Filter.calendarRange(2012,2017,'year'));

var index = [1,2,3,4,5,6,7,8,9,10,11,12];
var meanList = ee.List([]);

for (var i in index){
  var m = index[i];
  var imgColm = terraclim.filter(ee.Filter.calendarRange(m,m,'month'));
  var meanImg = imgColm.mean().multiply(0.1).rename('mean').set('month',ee.Number(m).format('%02d'));
  var meanList = meanList.add(meanImg);
}

var meanCol = ee.ImageCollection.fromImages(meanList);
print('Mean Collection', meanCol);

var Anom = terraclim.map(function(image){
  var month = ee.Number(image.get('month'));
  var monthMean = meanCol.filterMetadata('month','equals',month).first().rename('mean');
  var anomaly = image.multiply(0.1).subtract(monthMean).rename('anomaly');
  return image.addBands([anomaly,monthMean]);
});

print('imgList w/ Anomaly + Mean',Anom);
var chart = ui.Chart.image.seriesByRegion(Anom,aoi,ee.Reducer.mean(),'anomaly',scale,'system:time_start','NAME_1').setChartType('LineChart').setOptions({curveType:'function'});
print(chart);
