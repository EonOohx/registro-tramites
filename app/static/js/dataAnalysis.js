var socket = io.connect('http://127.0.0.1:3001');

const url = 'http://127.0.0.1:3000/getDataTramite'

var data = []
const configTramite = {
    type: "bar",
    data: {
        labels: ["CURP", "Asignacion de NSS", "Constancia de Vigencia de Derecho", "Recibo de Luz", "Acta de Nacimiento", "Comprobante de Localizacion", "Otros"],
        datasets: [
            {
                label: "Tramites",
                data: [0, 0, 0, 0, 0],
                borderWidth: 0,
            },
        ],
    },
    options: {
        scales: {
            y: {
                beginAtZero: true,
                maintainAspectRatio: false,
            },
        },
    },
}

const configWeek = {
    type: "bar",
    data: {
        labels: ["Mon", "Tue", "Wed", "Thur", "Fri"],
        datasets: [
            {
                label: "Tramites",
                data: [0, 0, 0, 0, 0],
                borderWidth: 0,
            },
        ],
    },
    options: {
        scales: {
            y: {
                beginAtZero: true,
                maintainAspectRatio: false,
            },
        },
    },
}
const ctxWeek = document.getElementById("weekchart");
const ctxTramite = document.getElementById("tramitechart");
var chartTramite = new Chart(ctxTramite, configTramite)
var chartWeek = new Chart(ctxWeek, configWeek)

socket.on("setdata", function (newData) {
    console.log(newData)
    updateData(newData)
})

async function fetchData() {
    await fetch(url).then(response => response.json()).then(data => {
        updateData(data)
    })
}

function updateData(newData) {
    chartWeek.data.datasets[0].data = Object.values(newData.weekday);
    chartTramite.data.datasets[0].data = Object.values(newData.typeFileNumbers);
    chartWeek.update();
    chartTramite.update();

}

fetchData();




