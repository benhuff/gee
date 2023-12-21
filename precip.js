var chirpsPentad = ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD");
print('Pentad',chirpsPentad.filterDate('2018-10-01','2018-10-31'));

var chirpsCrs = 'EPSG:4326';
var chirpsCrsTransform = [0.05,0,-180,0,-0.05,50];

var months = ee.List.sequence(1,12);
var nullImage = ee.Image(0);

var map_m = function(i) {
  i = ee.Number(i);
  var years = ee.List.sequence(1987, 2016);
  var filtered_col = years.map(function(j) {
    var filtered = chirpsPentad.filter(ee.Filter.calendarRange(i, i, 'month'))
                               .filter(ee.Filter.calendarRange(j, j, 'year'));
    var time = filtered.first().get('system:time_start');
    return ee.Algorithms.If(filtered.size().gt(5),
                            filtered.sum().set('year',j).set('month',i.format('%02d')).set('system:time_start',time).set('constant','n'),
                            nullImage.set('year',j).set('month',i).set('system:time_start',ee.Date.fromYMD(j,i,01).millis()).set('constant','y'));
  });
  return filtered_col;
};

var imgList_months = months.map(map_m);

var imgCol = ee.ImageCollection.fromImages(imgList_months.flatten()).sort('system:time_start').filterMetadata('constant','equals','n');
print('Sorted Image Collection', imgCol);

var imgCol_forMean = imgCol.filterDate('1987-01-01','2015-01-01');
var imgList_forMean = imgCol_forMean.toList(100);
print('Image List for Mean', imgList_forMean);

var index = [1,2,3,4,5,6,7,8,9,10,11,12];
var meanList = ee.List([]);

for (var i in index){
  var m = index[i];
  var imgColm = imgCol_forMean.filter(ee.Filter.calendarRange(m,m,'month'));
  var meanImg = imgColm.mean().rename('mean').set('month',ee.Number(m).format('%02d'));
  var meanList = meanList.add(meanImg);
}

var meanCol = ee.ImageCollection.fromImages(meanList);
print('Mean Collection', meanCol);

var Anom = imgCol.filterMetadata('constant','equals','n').map(function(image){
  var month = ee.Number(image.get('month'));
  var monthMean = meanCol.filterMetadata('month','equals',month).first().rename('mean');
  var anomaly = image.subtract(monthMean).rename('anomaly');
  return image.addBands([anomaly,monthMean]);
});

print('imgList w/ Anomaly + Mean',Anom);
//Map.addLayer(Anom.first().clip(aoi),{bands:['anomaly'],min:-10,max:10,palette:['red','white','blue']});
var chart = ui.Chart.image.seriesByRegion({
  imageCollection: Anom,
  regions:aoi,
  band: 'precipitation',
  reducer:ee.Reducer.mean(),
  scale:5565,
  xProperty:'system:time_start',
  seriesProperty:'ADM1_EN'}).setChartType('LineChart');
print(chart);

var chart2 = ui.Chart.image.seriesByRegion({
  imageCollection: Anom,
  regions:aoi,
  band: 'mean',
  reducer:ee.Reducer.mean(),
  scale:5565,
  xProperty:'system:time_start',
  seriesProperty:'ADM1_EN'}).setChartType('LineChart');
print(chart2);

var chart3 = ui.Chart.image.seriesByRegion({
  imageCollection: Anom,
  regions:aoi,
  band: 'anomaly',
  reducer:ee.Reducer.mean(),
  scale:5565,
  xProperty:'system:time_start',
  seriesProperty:'ADM1_EN'}).setChartType('LineChart');
print(chart3);
