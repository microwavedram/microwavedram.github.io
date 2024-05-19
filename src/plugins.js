let plugins = []

let plugin_runtimes = {}
window.plugins = {}

function getPluginData() {
    let new_data = JSON.parse(localStorage.getItem("plugins"))

    if (new_data == undefined) {
        new_data = []
    }

    plugins = new_data
}

function setPluginData() {
    localStorage.setItem("plugins", JSON.stringify(plugins))
}

function addPlugin(url) {
    if (!plugins.includes(url)) {
        plugins.push(url)
        setPluginData()
    }

    reloadPlugins()
    return "success"
}

function removePlugin(url) {
    if (plugins.includes(url)) {
        plugins = plugins.filter(plugin => plugin != url)
    }

    setPluginData()
    return "success"
}

function nukePlugins() {
    plugins = []
    setPluginData()

    return "success"
}

function reloadPlugins() {
    const body = document.getElementsByTagName("body")[0]

    Object.values(plugin_runtimes).forEach(container => container.remove())

    plugins.forEach(async url => {
        console.log(`Loading ${url}`)

        fetch(url).then(async src => {
            const container = document.createElement("script")
            container.innerHTML = await src.text()
            container.setAttribute("defer", "defer")

            plugin_runtimes[url] = container

            body.appendChild(container)
        }).catch(e => {
            console.warn(`Failed to load ${url}`, e)
        })
    })

    return "success"
}

getPluginData()
setPluginData()
reloadPlugins()