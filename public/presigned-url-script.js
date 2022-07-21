const formElement = document.querySelector("#form-action");
const fileInput = document.querySelector("#formFile");

formElement?.addEventListener("submit", async (evt) => {
	evt.preventDefault();

	const file = fileInput?.files[0];
	if (!file) {
		return alert("A file must be selected");
	}

	const extension = file.name.split(".").pop();

	// get a presigned url for the file, it will authorize using the cookie "access-token"
	const data = await fetch("/api/presigned-upload-url", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ extension: extension }),
	})
		.then(async (res) => {
			if (res.ok) {
				return res.json();
			} else {
				throw new Error(res.statusText);
			}
		})
		.catch((error) => {
			console.log(error);
		});

	if (!data || !data?.url) {
		console.log({ data });
		return;
	}

	let uploadSuccess = false;

	await fetch(data.url, {
		method: "PUT",
		headers: { "Content-Type": "multipart/form-data" },
		body: file,
	})
		.then((res) => {
			if (res.ok) {
				uploadSuccess = true;
				return res.text();
			} else {
				Promise.reject(res);
			}
		})
		.catch((error) => {
			console.log(error);
		});

	if (!uploadSuccess) return;

	await fetch("/api/confirm-upload", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ storageKey: data.storageKey }),
	}).then(() => {
		window.location.href = "/files";
	});
});
