let startButt = document.getElementById("Start");
let stopButt = document.getElementById("Stop");
let finishButt = document.getElementById("Save");
let currentTime = document.getElementById("time");
let profilePage = document.getElementById("profile");
let totalTime = document.getElementById("totalTime");
let home = document.getElementById("home");
let profileButt = document.getElementById("profileTab");
let homeButt = document.getElementById("homeTab");
let flightTimePERDAY = document.getElementById("flightTime");
let droneINPUT = document.getElementById("dronename");
import { openDB } from 'idb';

const dbPromise = openDB('keyval-store', 1, {
  upgrade(db) {
    db.createObjectStore('keyval');
  },
});

export async function get(key) {
  return (await dbPromise).get('keyval', key);
}
export async function set(key, val) {
  return (await dbPromise).put('keyval', val, key);
}
export async function del(key) {
  return (await dbPromise).delete('keyval', key);
}
export async function clear() {
  return (await dbPromise).clear('keyval');
}
export async function keys() {
  return (await dbPromise).getAllKeys('keyval');
}
homeButt.addEventListener("click", () => {
    profilePage.style.display = "none";
    home.style.display = "flex";
});

profileButt.addEventListener("click", () => {
    home.style.display = "none";
    profilePage.style.display = "flex";
});



class Entry {
    constructor() {
        // In Seconds
        this.length = 0;
        this.drone = ""; // Drone name
        this.date = new Date().toLocaleDateString(); // Format as a user-friendly date
        this.finished = false;
        this.stopped = true;
        this.intervalId = null; // To store the interval ID
    }

    start() {
        if (this.stopped) {
            this.stopped = false;
            this.intervalId = setInterval(() => {
                if (!this.finished) {
                    this.length += 1;
                    set('activeEntry', this); // Save active entry state
                }
            }, 1000);
        }
    }

    stop() {
        if (!this.stopped) {
            this.stopped = true;
            clearInterval(this.intervalId); // Clear the interval
            set('activeEntry', this); // Save active entry state
        }
    }

    finish() {
        this.finished = true;
        this.stop(); // Ensure stopping the timer when finished
        set('activeEntry', this); // Save active entry state
    }
}

let entries = [];
let activeEntry = null;
const initialize = async () => {
    const savedEntries = await get('entries');
    if (savedEntries) {
        entries = savedEntries.map(entry => {
            // Convert date string to proper format if necessary
            if (entry.date) {
                try {
                    const parsedDate = new Date(entry.date);
                    entry.date = isNaN(parsedDate) ? new Date().toLocaleDateString() : parsedDate.toLocaleDateString();
                } catch {
                    entry.date = new Date().toLocaleDateString();
                }
            }
            return Object.assign(new Entry(), entry);
        });
        activeEntry = entries.find(entry => !entry.finished);
    }
    updateFlightTimePerDay();
    totalTime.innerHTML = entries.reduce((total, entry) => total + entry.length, 0) + " seconds";
};

const updateFlightTimePerDay = () => {
    // Aggregate total flight time per day
    const dailyTotals = entries.reduce((acc, entry) => {
        if (!acc[entry.date]) {
            acc[entry.date] = { total: 0, drones: {} };
        }
        acc[entry.date].total += entry.length;
        if (!acc[entry.date].drones[entry.drone]) {
            acc[entry.date].drones[entry.drone] = 0;
        }
        acc[entry.date].drones[entry.drone] += entry.length;
        return acc;
    }, {});

    // Display total flight time per day along with all entries
    let flightTimeHtml = '<h2>Flight Time Per Day</h2>';
    for (const [date, { total, drones }] of Object.entries(dailyTotals)) {
        flightTimeHtml += `<p><strong>${new Date(date).toLocaleDateString()}:</strong> ${total} seconds</p>`;
        for (const [drone, time] of Object.entries(drones)) {
            flightTimeHtml += `<p>&nbsp;&nbsp;${drone}: ${time} seconds</p>`;
        }
    }
    
    // Display all entries with date and length
    flightTimeHtml += '<h3>All Entries</h3>';
    entries.forEach(entry => {
        flightTimeHtml += `<p>${entry.date} - ${entry.drone}: ${entry.length} seconds${entry.finished ? ' (Finished)' : ''}</p>`;
    });

    flightTimePERDAY.innerHTML = flightTimeHtml;
};

startButt.addEventListener("click", () => {
    if (activeEntry && !activeEntry.finished) {
        activeEntry.start();
    } else {
        let entry = new Entry();
        entry.drone = droneINPUT.value; // Get the drone name from the input
        entry.start();
        entries.push(entry);
        activeEntry = entry; // Set the newly created entry as active
        set('entries', entries); // Save entries state
        updateFlightTimePerDay(); // Update flight time per day
    }
});

stopButt.addEventListener("click", () => {
    if (activeEntry) {
        activeEntry.stop();
        set('entries', entries); // Save entries state
        updateFlightTimePerDay(); // Update flight time per day
    }
});

finishButt.addEventListener("click", () => {
    if (activeEntry) {
        activeEntry.finish();
        activeEntry = null;
        set('entries', entries); // Save entries state
        updateFlightTimePerDay(); // Update flight time per day
    }
});

function loop() {
    if (activeEntry) {
        currentTime.innerHTML = activeEntry.length;
    } else {
        currentTime.innerHTML = 0;
    }

    console.log(entries);
    requestAnimationFrame(loop);
}

// Initialize the app by loading any saved data
initialize().then(() => {
    loop();
});
