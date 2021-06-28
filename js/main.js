const video = document.getElementById("video");
let predictedAges = [];

/****Loading the model ****/
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    faceapi.nets.faceExpressionNet.loadFromUri("/models"),
    faceapi.nets.ageGenderNet.loadFromUri("/models")
]).then(startVideo);

function startVideo() {
    navigator.getUserMedia({
            video: {}
        },
        stream => (video.srcObject = stream),
        err => console.error(err)
    );
}

/****Event Listeiner for the video****/
video.addEventListener("playing", () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    let container = document.getElementById("video-container");
    container.append(canvas);

    const videoStyles = window.getComputedStyle(video);
    const displaySize = {
        width: parseInt(videoStyles.width, 10),
        height: parseInt(videoStyles.height, 10)
    };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        try {
            const detections = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions()
                .withAgeAndGender();

            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

            /****Drawing the detection box and landmarkes on canvas****/
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

            /****Setting values to the DOM****/
            if (resizedDetections && Object.keys(resizedDetections).length > 0) {
                const age = resizedDetections.age;
                const interpolatedAge = Math.round(interpolateAgePredictions(age));
                const gender = resizedDetections.gender;
                const expressions = resizedDetections.expressions;
                const maxValue = Math.max(...Object.values(expressions));
                const emotion = Object.keys(expressions).filter(
                    item => expressions[item] === maxValue
                );
                document.getElementById("age").innerText = `Age - ${interpolatedAge}`;
                document.getElementById("gender").innerText = `Gender - ${gender}`;
                document.getElementById("emotion").innerText = `Emotion - ${emotion[0]}`;
            }
        } catch (ex) {
            console.error(ex);
        }
    }, 100);
});

function interpolateAgePredictions(age) {
    predictedAges = [age].concat(predictedAges).slice(0, 30);
    const avgPredictedAge =
        predictedAges.reduce((total, a) => total + a) / predictedAges.length;
    return avgPredictedAge;
}