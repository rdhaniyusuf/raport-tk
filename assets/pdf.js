var urlSearchParams = new URLSearchParams(window.location.search);
var itemId = urlSearchParams.get('id');

if (itemId) {
    loadDataFromIndexedDB(itemId);
} else {
    console.log("No ID found in the URL.");
}


function displayBlobsInHTML(blob, elementId, key) {

	if (key != null) {

		const element = document.getElementById(String(elementId + "-" + key));
		const objectUrl = URL.createObjectURL(blob);

		const img = document.createElement('img');
		img.src = objectUrl;
		img.alt = "Image";
		element.appendChild(img);
	} else {
		const element = document.getElementById(String(elementId));
		const objectUrl = URL.createObjectURL(blob);

		const img = document.createElement('img');
		img.src = objectUrl;
		img.alt = "Image";
		element.appendChild(img);
	}
}

function base64toBlob(base64Data, format) {
	const byteCharacters = atob(base64Data);
	const byteNumbers = new Array(byteCharacters.length);

	for (let i = 0; i < byteCharacters.length; i++) {
		byteNumbers[i] = byteCharacters.charCodeAt(i);
	}

	const byteArray = new Uint8Array(byteNumbers);
	return new Blob([byteArray], { type: `image/${format}` });
}

async function getDecodedAndDecompressedFiles(id, input) {
	const files = input;
	if (files.length > 0) {
		Object.keys(files).forEach(async (k) => {
			const blob = base64toBlob(files[k].base64, files[k].format)
			displayBlobsInHTML(blob, id, k)
		})
	} else {
		const blob = base64toBlob(files.base64, files.format)
		displayBlobsInHTML(blob, id, k = null)
	}
}

document.addEventListener('DOMContentLoaded', function () {
	loadDataFromIndexedDB();
});

function loadDataFromIndexedDB(dataId) {
	var request = window.indexedDB.open("FormDataDB", 1);

	request.onerror = function (event) {
		console.error("Error opening IndexedDB:", event.target.error);
	};

	request.onsuccess = function (event) {
		var db = event.target.result;
		var transaction = db.transaction("FormDataStore", "readonly");
		var objectStore = transaction.objectStore("FormDataStore");

		var getDataRequest = objectStore.getAll();

		getDataRequest.onsuccess = function (event) {
			var data = event.target.result;
			displayLoadedData(data, dataId);
		};

		getDataRequest.onerror = function (event) {
			console.error("Error loading data from IndexedDB:", event.target.error);
		};
	};
}

async function displayValueInHTML(value, elementId) {
    const elements = document.querySelectorAll('[id="' + String(elementId) + '"]');

    if (!elements) {
        console.log("Element with ID " + elementId + " not found.");
        return; // exit the function if the element is not found
    }
	elements.forEach(function (element){
    const newElement = document.createElement("span");
    newElement.textContent = String(value);
    element.appendChild(newElement);

	})

}

function displayLoadedData(data, dataId) {
	data.forEach(function (item) {
		Object.keys(item).forEach(async (k) => {
			if (item["dataId"] == dataId) {
				if (k == "tempat-ttl") {
					var monthNames = [
						"Januari", "Februari", "Maret", "April",
						"Mei", "Juni", "Juli", "Agustus",
						"September", "Oktober", "November", "Desember"
					];
					var dateObj = new Date(item["tanggal-lahir"])
					var day = dateObj.getDate();
					var month = dateObj.getMonth();
					var year = dateObj.getFullYear();

					var monthName = monthNames[month]

					var date = day + " " + monthName + " " + year;
					const ttl = item[k] + ", " + date;
					await displayValueInHTML(ttl, String(k))

					if ("tanggal-lahir" in item) {
						delete item["tanggal-lahir"];
					}
					delete item[k];
				} else if (k == "jalan") {
					const newJalan = item["jalan"] + ", " + item["dusun"]
					await displayValueInHTML(newJalan, String(k))
					if ("dusun" in item) {
						delete item["dusun"];
					}
				} else if (k.startsWith("foto-kegiatan")) {
					await getDecodedAndDecompressedFiles(k, JSON.parse(item[k]));
				} else {
					const value = item[k];
					await displayValueInHTML(value, String(k))
				}
			}

		});

	});
}