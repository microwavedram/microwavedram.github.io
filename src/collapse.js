const elements = document.getElementsByClassName("collapsible")

for (let index = 0; index < elements.length; index++) {
	const element = elements[index]

	const content = element.nextElementSibling
	const orig = content.style.display

	element.addEventListener("click", (event) => {
		if (content.style.display === orig) {
			content.style.display = "none"
		} else {
			content.style.display = orig
		}
	})
}
