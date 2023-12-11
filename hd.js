// var dataset = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
//                   .filter(ee.Filter.date('2019-01-01', '2019-12-31'));
// var nighttime = dataset.select('avg_rad');
// var nighttimeVis = {min: 0.0, max: 60.0};
// // Map.addLayer(nighttime, nighttimeVis, 'Nighttime');

// // Convert the image collection to a single multi-band image. Note that image ID
// // ('system:index') is prepended to band names to delineate the source images.
// var img = nighttime.toBands();

// var aoi = table.filter(ee.Filter.eq('SUBREGION', 'Southern Asia')).first();
// var aoi = aoi.geometry().buffer(0.01);
// Map.addLayer(aoi);

// var clipped = img.clip(geometry);
// print('Collection', nighttime);
// print('Collection to bands', clipped);
// // Map.addLayer(clipped.select('20220101_avg_rad'), nighttimeVis, 'Nighttime');

// var proj = clipped.projection().getInfo();
// var crs = proj.crs;
// var crsTransform = proj.transform;

// Export.image.toDrive({
//   image: clipped,
//   description: 'vcmslcfg_2019',
//   folder: 'VIIRS_Subregions',
//   crs: crs,
//   crsTransform: crsTransform,
//   region: geometry,
//   maxPixels: 100000000,
// });
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA');

var image = ee.Image(
  l8.filterBounds(geometry2.centroid({'maxError': 1}))
    .filterDate('2016-01-17', '2018-02-20')
    .sort('CLOUD_COVER')
    .first()
);
print(image)
// Compute the Normalized Difference Vegetation Index (NDVI).
var nir = image.select('B5');
var red = image.select('B4');
var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI').clip(geometry2);

// Display the result.
var ndviParams = {min: -1, max: 1, palette: ['red', 'yellow', 'green']};
Map.addLayer(ndvi, ndviParams, 'NDVI image');

var collection = ee.ImageCollection("NASA/HLS/HLSL30/v002")
                    .filter(ee.Filter.date('2017-01-17', '2018-02-20'))
                    .filter(ee.Filter.lt('CLOUD_COVERAGE', 10));
var visParams = {
  bands: ['B4', 'B3', 'B2'],
  min:0.01,
  max:0.18,
};

var visualizeImage = function(image) {
  var imageRGB = image.visualize(visParams);
  return imageRGB;
};

var rgbCollection = collection.map(visualizeImage);

Map.addLayer(rgbCollection, {}, 'HLS RGB bands');

// var dataset = ee.ImageCollection('NOAA/VIIRS/001/VNP46A1').filter(
//   ee.Filter.date('2021-08-31', '2021-09-01'));

// // At-sensor Day/night Band radiance (DNB).
// var dnb = dataset.select('DNB_At_Sensor_Radiance_500m').first().clip(geometry2);
// var dnbVis = {
//   min: 0,
//   max: 100,
//   palette: ['black', 'purple', 'red', 'orange', 'yellow', 'white'],
// };

// Map.addLayer(dnb, dnbVis, '2021-08-31');

var dataset2 = ee.ImageCollection('NOAA/VIIRS/001/VNP46A1').filter(
  ee.Filter.date('2017-09-20', '2017-09-21'));

// At-sensor Day/night Band radiance (DNB).
var dnb2 = dataset2.select('DNB_At_Sensor_Radiance_500m').first().clip(geometry2);

var maxDict = dnb2.reduceRegion({
  reducer: ee.Reducer.max(),
  geometry: geometry2,
  scale: 30, // Set an appropriate scale for your analysis
  maxPixels: 1e9
});

// Print the result
print('Maximum value:', maxDict);

var referenceProjection = ndvi.projection();
var scale = referenceProjection.nominalScale();

// Reproject the target image
// var resampledImage = dnb2.reproject({
//   crs: referenceProjection,
//   scale: scale
// });

var resampledImage = dnb2.resample('bicubic').reproject({
  crs: referenceProjection,
  scale: scale
})
print(resampledImage)

var maxValue = ee.Number(maxDict.get('DNB_At_Sensor_Radiance_500m'));

// Create a new image by dividing the original image by its maximum value
var normalizedImage = dnb2.divide(maxValue);

var dnbVis2 = {
  min: 0,
  max: 1,
  palette: ['black', 'purple', 'red', 'orange', 'yellow', 'white'],
};

Map.addLayer(normalizedImage, dnbVis2, '2017-09-20');

var combinedImage = ndvi.addBands(normalizedImage);

// Optionally, rename the bands
combinedImage = combinedImage.rename('ndvi', 'dnb');

var ndui = combinedImage.normalizedDifference(['dnb', 'ndvi']).rename('NDUI');

var dnbVis2 = {
  min: 0,
  max: 1,
  palette: ['black', 'purple', 'red', 'orange', 'yellow', 'white'],
};

Map.addLayer(nir)
Map.addLayer(normalizedImage, dnbVis2, '2017-09-20');
Map.addLayer(ndui, dnbVis2, 'NDUI');
