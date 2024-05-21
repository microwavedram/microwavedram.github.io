const nation_div = document.getElementById("nation")
const search_box = document.getElementById("search")
const search_results = document.getElementById("search_results")
const unselect = document.getElementById("unselect")
lands = {}

fetch("lands_pub.json").then(async res => {
    const data = await res.json()

    lands = data

})

function search(string) {
    const names_map = {}

    for (const [land_name, land_data] of Object.entries(lands)) {
        if (land_name.toLowerCase().includes(string.toLowerCase())) {
            names_map[land_name] = true
            continue
        }

        if (land_data.players) {
            if (land_name == "Seraphia") {
            }
            if (land_data.players.map(name => name.toLowerCase()).some(name => name.includes(string.toLowerCase()))) {
                names_map[land_name] = true
            }
        }
    }

    const generated = Object.keys(names_map).map(name => {
        const nation_data = lands[name]

        return `<li><a class="search_result" href="#">${name}</a></li>`
    }).join("")

    search_results.innerHTML = generated
}

function setSelectedNation(nation_name) {
    const nation = lands[nation_name]

    if (!nation) {
        nation_div.style.display = "none"
        return
    }
    nation_div.style.display = "block"

    rows = ""

    if (nation.players) {
        nation.players.forEach(player => {
            rows += `<tr>
                <td>${player}</td>
                <td>unknown</td>
                <td>unknown</td>
                </tr>
            </tr>`
        })
    }

    nation_div.children.item(0).innerHTML = nation_name

    nation_div.children.item(3).innerHTML = `Name: ${nation_name}
    <br>Players: ${(nation.players || []).length}
    <br>Chunks: ${nation.chunks}
    <br>Balance: ${nation.balance}`

    nation_div.children.item(7).innerHTML = `<tr>
        <th>Player</th>
        <th>Rank</th>
        <th>Tiered</th>
    </tr>
    ${rows}`

    nation_div.children.item(9).name = nation_name
}

function trigger_search(event) {
    search(search_box.value)
}

addEventListener("click", e => {
    if (e.target.className == "search_result") {
        setSelectedNation(e.target.innerHTML)
    }
})
unselect.onclick = () => setSelectedNation(undefined)
search_box.onchange = trigger_search    
search_box.onkeypress = trigger_search
search_box.onpaste = trigger_search
search_box.oninput = trigger_search