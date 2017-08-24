// Takes a set of points and a set of street geometries. Fits labels to those streets, giving counts of how many labels
// of each label type are closest to each street. Streets are then also split up into smaller line segments, and the
// same counts are then tabulated for each of those segments.
function setupIRR(data) {
    // unpack different pieces of data
    let streetsData = data.streets;
    let labelsData = data.labels;
    let routes = [...new Set(streetsData.features.map(street => street.properties.route_id))]; // gets unique set of routes
    let turkers = [...new Set(labelsData.features.map(label => label.properties.turker_id))]; // gets unique set of turkers
    let output = [];
    for(let i = 0; i < routes.length; i++) output[i] = {};

    for(let routeIndex = 0; routeIndex < routes.length; routeIndex++) {
        let currRoute = routes[routeIndex];
        let segs = streetsData.features.filter(street => street.properties.route_id === currRoute);
        let labs = labelsData.features.filter(label => label.properties.route_id === currRoute);
        let streetOutput =
            {"CurbRamp": {}, "NoCurbRamp": {}, "NoSidewalk": {},"Obstacle": {}, "Occlusion": {}, "SurfaceProblem": {}};
        for (let key in streetOutput) {
            if (streetOutput.hasOwnProperty(key)) {
                streetOutput[key] = [];
                for (let i = 0; i < segs.length; i++) {
                    streetOutput[key][i] = {};
                    for (let j = 0; j < turkers.length; j++) {
                        streetOutput[key][i][turkers[j]] = 0;
                    }
                }
            }
        }

        // street level
        for(let labIndex = 0; labIndex < labs.length; labIndex++) {
            // let currLabel = turf.point([labelsData[labIndex].lng, labelsData[labIndex].lat]);
            let currLabel = labs[labIndex];

            // get closest street to this label
            // http://turfjs.org/docs/#pointonline
            let segIndex;
            let minDist = Number.POSITIVE_INFINITY;
            for (let i = 0; i < segs.length; i++) {
                let closestPoint = turf.pointOnLine(segs[i], currLabel);
                if (closestPoint.properties.dist < minDist) {
                    segIndex = i;
                    minDist = closestPoint.properties.dist;
                }
            }

            // increment this street's count of labels (of this label type)
            streetOutput[currLabel.properties.label_type][segIndex][currLabel.properties.turker_id] += 1;

        }
        output[routeIndex].street = streetOutput;


        // segment level
        // combine streets into a set of contiguous linestrings
        // http://turfjs.org/docs/#combine -- combines the different streets into a single MultiLineString
        // http://turfjs.org/docs/#lineintersect -- lets you know the points where two lines intersect
        let combinedStreets = turf.combine(streetsData);


        let segDists = [0.005, 0.01]; // in meters
        for(let segDistIndex = 0; segDistIndex < segDists.length; segDistIndex++) {
            let segDist = segDists[segDistIndex];

            // split streets into a bunch of little segments based on segDist and length of each contiguous segment
            // TODO make sure that each contiguous segment is done separately
            // TODO pick actual distance for each contiguous segment separately so that all segs are approx equal
            // http://turfjs.org/docs/#linechunk
            let chunks = turf.lineChunk(combinedStreets, segDist).features;

            let segOutput =
                {"CurbRamp": {}, "NoCurbRamp": {}, "NoSidewalk": {},"Obstacle": {}, "Occlusion": {}, "SurfaceProblem": {}};
            for (let key in segOutput) {
                if (segOutput.hasOwnProperty(key)) {
                    segOutput[key] = [];
                    for (let i = 0; i < chunks.length; i++) {
                        segOutput[key][i] = {};
                        for (let j = 0; j < turkers.length; j++) {
                            segOutput[key][i][turkers[j]] = 0;
                        }
                    }
                }
            }

            for(let labIndex = 0; labIndex < labs.length; labIndex++) {
                let currLabel = labs[labIndex];

                // get closest segment to this label
                // http://turfjs.org/docs/#pointonline
                let chunkIndex;
                let minDist = Number.POSITIVE_INFINITY;
                for (let i = 0; i < chunks.length; i++) {
                    let closestPoint = turf.pointOnLine(chunks[i], currLabel);
                    if (closestPoint.properties.dist < minDist) {
                        chunkIndex = i;
                        minDist = closestPoint.properties.dist;
                    }
                }

                // increment this segment's count of labels (of this label type)
                segOutput[currLabel.properties.label_type][chunkIndex][currLabel.properties.turker_id] += 1;

            }
            output[routeIndex][String(segDist * 1000) + "_meter"] = segOutput;
        }
    }

    // combine the results from all the routes into a single, condensed object to be output as CSV
    let out = {};
    for (let level in output[0]) {
        if (output[0].hasOwnProperty(level)) {
            out[level] = {"CurbRamp": {}, "NoCurbRamp": {}, "NoSidewalk": {},"Obstacle": {}, "Occlusion": {}, "SurfaceProblem": {}};
            for (let label_type in out[level]) {
                if (out[level].hasOwnProperty(label_type)) {
                    out[level][label_type] = [];
                    for (let j = 0; j < output.length; j++) {
                        out[level][label_type] = out[level][label_type].concat(output[j][level][label_type]);
                    }
                }
            }
        }
    }
    return out;
}

function convertToCSV(objArray) {
    let array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    let str = '';

    for (let i = 0; i < array.length; i++) {
        let line = '';
        for (let index in array[i]) {
            if (line !== '') line += ',';
            line += array[i][index];
        }
        str += line + '\r\n';
    }
    return str;
}

function exportCSVFile(items, fileTitle) {

    // Convert Object to JSON
    let jsonObject = JSON.stringify(items);

    let csv = this.convertToCSV(jsonObject);

    let exportedFilename = fileTitle + '.csv';

    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, exportedFilename);
    } else {
        let link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            let url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", exportedFilename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

// TODO Takes the results of the IRR setup and outputs the CSVs on the client machine. Maybe all in a .tar or something?
function outputData(outputJson) {

    for (let category in outputJson) {
        if (outputJson.hasOwnProperty(category)) {
            console.log(category);
            console.log(outputJson[category]);

            let categoryJson = outputJson[category];
            for (let labelType in categoryJson) {
                if (categoryJson.hasOwnProperty(labelType)) {
                    let fileTitle = category + '_' + labelType;
                    console.log(labelType + ' ' + fileTitle);

                    // Call the exportCSVFile() to trigger the download
                    exportCSVFile(categoryJson[labelType], fileTitle);
                }
            }
        }
    }

}

function IRR(data, turf) {
    console.log("Data received: ", data);
    let output = setupIRR(data);
    console.log(output);
    outputData(output);
}