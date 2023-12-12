let jsonData = {};

function pilihSatu(checkboxId) {
	var checkboxes = document.getElementsByName('agama');

	for (var i = 0; i < checkboxes.length; i++) {
		checkboxes[i].checked = false;
	}

	document.getElementById(checkboxId).checked = true;
}

document.getElementById("submit-data-rapor").addEventListener('submit', async function (e) {
	e.preventDefault();

	var formData = new FormData(this);
	var promises = [];

	formData.forEach(function (v, k) {
		if (k == "agama") {
			jsonData["agama"] = getRadioValue("agama");
		}
		else if (k == "jk") {
			jsonData["jk"] = getRadioValue("jk");
		} else if (k.startsWith("foto-kegiatan")) {
			promises.push(getUploadedFiles(k).then(result => jsonData[k] = JSON.stringify(result)));
		} else {
			jsonData[k] = v;
		}
	})

	await Promise.all(promises);

	console.log(formData);
	console.log(jsonData);

	saveDataToIndexedDB(jsonData);
});


function saveDataToIndexedDB(data) {
	var request = window.indexedDB.open("FormDataDB", 1);

	const dataId = new Date().getTime().toString();
	

	data.dataId = dataId
	request.onerror = function (event) {
		console.error("Error opening IndexedDB:", event.target.error);
	};

	request.onupgradeneeded = function (event) {
		var db = event.target.result;
		var objectStore = db.createObjectStore("FormDataStore", { keyPath: "dataId" });
	};

	request.onsuccess = function (event) {
		var db = event.target.result;
		var transaction = db.transaction("FormDataStore", "readwrite");
		var objectStore = transaction.objectStore("FormDataStore");

		// Add data to the object store
		var addRequest = objectStore.add(data);

		addRequest.onsuccess = function (event) {
			console.log("Data added to IndexedDB successfully.");
			const url = `index-pdf.html?id=${dataId}`;
			window.open(url, '_blank')
		};

		addRequest.onerror = function (event) {
			console.error("Error adding data to IndexedDB:", event.target.error);
		};
	};
}

function sendData(data) {

	const encodeData = btoa(JSON.stringify(data))
	console.log("btoa", encodeData)
	const encodeDataJSON = {
		encodeData: encodeData
	}
	const compressedData = LZString.compressToBase64(JSON.stringify(encodeDataJSON));

	console.log(compressedData)
	const dataId = new Date().getTime().toString(); // Gunakan ID yang unik
	sessionStorage.setItem(dataId, compressedData);

	// Buka halaman baru dengan ID sebagai parameter
	const url = `index-pdf.html?id=${dataId}`;
	window.open(url, '_blank')
	// sessionStorage.removeItem(dataKey);
}

// Fungsi untuk mendapatkan nilai dari radio button yang dipilih
function getRadioValue(name) {
	const radios = document.getElementsByName(name);

	for (let i = 0; i < radios.length; i++) {
		if (radios[i].checked) {
			return radios[i].id;
		}
	}
	return null;
}

async function compressBase64(inputBase64) {
	if (inputBase64.includes(',')) {
		// Handle multiple files
		const base64Array = inputBase64.split(',');
		const compressedArray = await Promise.all(base64Array.map(compressSingleBase64));
		return compressedArray.join(',');
	} else {
		// Handle single file
		return compressSingleBase64(inputBase64);
	}
}

async function compressSingleBase64(inputBase64) {
	const CHUNK_SIZE = 1024;
	const decodedData = atob(inputBase64);
	const uint8Array = new Uint8Array(decodedData.length);

	for (let i = 0; i < decodedData.length; i++) {
		uint8Array[i] = decodedData.charCodeAt(i);
	}

	const chunks = [];
	for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
		const chunk = uint8Array.subarray(i, i + CHUNK_SIZE);
		chunks.push(chunk);
	}

	try {
		const compressedChunks = await Promise.all(chunks.map(chunk => pako.deflate(chunk)));
		const compressedData = new Uint8Array(compressedChunks.reduce((acc, c) => acc.concat(Array.from(c)), []));
		const compressedBase64 = btoa(String.fromCharCode.apply(null, compressedData));
		return compressedBase64;
	} catch (error) {
		console.error('Error compressing data:', error);
		return null;
	}
}
async function readAndEncodeFile(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);

		reader.onloadend = async () => {
			const base64Data = reader.result.split(',')[1];
			// const compressedBase64 = await compressBase64(base64Data);
			const compressedBase64 = await base64Data;
			resolve({
				base64: compressedBase64,
				format: file.type,
			});
		};

		reader.onerror = (error) => {
			reject(error);
		};
	});
}

async function getUploadedFiles(inputId) {
	const input = document.getElementById(inputId);
	const files = input.files;

	if (files.length > 0) {
		if (input.multiple) {
			const fileList = Array.from(files);
			const promises = fileList.map(file => readAndEncodeFile(file));
			return await Promise.all(promises);
		} else {
			return await readAndEncodeFile(files[0]);
		}
	} else {
		return null;
	}
}
