const video = document.getElementById('video')
const startElem = document.getElementById("start")
const stopElem = document.getElementById("stop")
const captureElem = document.getElementById("capture")
const captured = document.getElementById("captured")
const submit = document.getElementById("submit")
const urlInput = document.getElementById("urlInput")
let yourImageUrl = ''

// start streaming on click
startElem.addEventListener("click", function(evt) {
  startVideo()
}, false)

// stop streaming on click
stopElem.addEventListener("click", function(evt) {
  stopVideo()
}, false)

// load models and get image
submit.addEventListener("click", function(evt) {
  yourImageUrl = urlInput.value
  console.log(yourImageUrl)
  if (yourImageUrl !== '') {
    Promise.all([
      faceapi.nets.faceRecognitionNet.loadFromUri('models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('models'),
      faceapi.nets.ssdMobilenetv1.loadFromUri('models'),
    ]).then(start)
  }
}, false)

// start streaming
async function startVideo() {
  // navigator.getUserMedia(
  //   { video: {} },
  //   stream => video.srcObject = stream,
  //   err => console.error(err)
  // )
  const stream = await navigator.mediaDevices.getUserMedia({
      video : true,
      audio: false
  })
  video.srcObject = stream
}

// stop streaming
function stopVideo() {
  let tracks = video.srcObject.getTracks()

  tracks.forEach(track => track.stop())
  video.srcObject = null
}


// -------------------------------
async function start() {
  const container = document.createElement('div')
  container.style.position = 'relative'
  document.body.append(container)
  
  // load image yang diinputkan user untuk pembanding
  const labeledFaceDescriptors = await loadLabeledImages(yourImageUrl)
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6)
  let image
  let canvas
  // tanda kalau sudah loaded dan bisa mulai untuk streaming lalu capture
  document.body.append('Loaded')

  captureElem.addEventListener( "click", async () => {
    let photoFound = false
    // cek apakah foto wajah sudah ditewajahn, jika belum maka ulang sampai ketemu
    while (photoFound == false) {

      // capture image dari video streaming
      var ctx = captured.getContext( '2d' )
      var image = new Image()
      ctx.drawImage( video, 0, 0, video.width, video.height )
      image.src		= captured.toDataURL( "image/png" )

      canvas = document.getElementById('captured')
      const displaySize = { width: canvas.width, height: canvas.height }

      // deteksi wajah menggunakan landmark wajah seperti bibir, mata, hidung, dan lainnya
      const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors()
      const resizedDetections = faceapi.resizeResults(detections, displaySize)
      
      // mencocokkan wajah yang dideteksi dengan wajah yang diinput oleh user
      const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))

      // cek apakah sudah menemukan wajah (terlepas itu sama atau tidak)
      if (results === undefined || results.length === 0) {
        console.log('kosong')
      } else {
        console.log(results)
        photoFound = true
        stopVideo()
        
        // membuat kotak dan label untuk menampilkan hasil
        results.forEach((result, i) => {
          const box = resizedDetections[i].detection.box
          const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() })
          drawBox.draw(canvas)
        })
      }
    }
  })
}

function loadLabeledImages(yourImageUrl) {
  const labels = ['face matched']
  return Promise.all(
    labels.map(async label => {
      const descriptions = []
      // url foto yang akan jadi pembanding
      const img = await faceapi.fetchImage(yourImageUrl)
      // deteksi wajah pada foto yang diinputkan user
      const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
      descriptions.push(detections.descriptor)

      return new faceapi.LabeledFaceDescriptors(label, descriptions)
    })
  )
}
