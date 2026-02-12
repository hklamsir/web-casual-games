/* Astro-Gardener - Game Files */

// Placeholder for game logic
console.log("Welcome to Astro-Gardener!");

// --- Game State ---
let gameState = {
    day: 1,
    resources: {
        water: 100,
        nutrients: 50,
        energy: 75,
        credits: 0
    },
    plants: [], // [{ species: 'Sunpetal', stage: 'seedling', needs: { water: 10, light: 50, temp: 25 }, growth: 0, maxGrowth: 100, mutationChance: 0.1 }]
    environment: {
        temperature: 20, // Celsius
        light: 60,       // Percentage
        weather: 'clear' // 'clear', 'rain', 'solar_flare', 'dust_storm'
    },
    research: {
        level: 1,
        available: ['advanced_hydroponics']
    }
};

// --- Game Functions ---

function updateEnvironment() {
    // Simulate random weather changes
    const weatherTypes = ['clear', 'rain', 'solar_flare', 'dust_storm'];
    gameState.environment.weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];

    // Adjust environmental factors based on weather
    switch (gameState.environment.weather) {
        case 'clear':
            gameState.environment.temperature = 20 + Math.random() * 5;
            gameState.environment.light = 70 + Math.random() * 20;
            break;
        case 'rain':
            gameState.environment.temperature = 18 + Math.random() * 4;
            gameState.environment.light = 50 + Math.random() * 10;
            gameState.environment.resources.water += 15;
            break;
        case 'solar_flare':
            gameState.environment.temperature = 30 + Math.random() * 10;
            gameState.environment.light = 90 + Math.random() * 10;
            // Damages unprotected plants
            break;
        case 'dust_storm':
            gameState.environment.temperature = 22 + Math.random() * 3;
            gameState.environment.light = 30 + Math.random() * 15;
            // Reduces growth, consumes more water
            break;
    }
     // Keep parameters within reasonable bounds
     gameState.environment.temperature = Math.max(10, Math.min(40, gameState.environment.temperature));
     gameState.environment.light = Math.max(0, Math.min(100, gameState.environment.light));
}

function processPlantGrowth() {
    gameState.plants.forEach((plant, index) => {
        let growthModifier = 1;
        let waterEff = 1;
        let lightEff = 1;
        let tempEff = 1;

        // Water needs
        const waterNeeded = plant.needs.water;
        if (gameState.resources.water >= waterNeeded) {
            gameState.resources.water -= waterNeeded;
            waterEff = 1.2;
        } else {
            waterEff = 0.5; // Reduced growth if not enough water
        }

        // Light needs
        if (gameState.environment.light >= plant.needs.light) {
            lightEff = 1.3;
        } else {
            lightEff = 0.7; // Reduced growth if not enough light
        }

        // Temperature needs
        const tempDiff = Math.abs(gameState.environment.temperature - plant.needs.temp);
        tempEff = Math.max(0.2, 1 - tempDiff / 20); // Growth penalty for temperature difference

        // Apply weather effects
        if (gameState.environment.weather === 'solar_flare') {
            growthModifier *= 0.5; // Damage from solar flare
        } else if (gameState.environment.weather === 'dust_storm') {
            growthModifier *= 0.7;
            plant.needs.water *= 1.2; // Dust storms consume more water
        }

        const effectiveGrowthRate = (0.5 + Math.random() * 0.5) * growthModifier * waterEff * lightEff * tempEff; // Base growth + random + modifiers
        plant.growth += effectiveGrowthRate;

        if (plant.growth >= plant.maxGrowth) {
            plant.growth = plant.maxGrowth;
            // Check for harvest or next stage
            if (plant.stage === 'seedling') {
                plant.stage = 'mature';
                // Potentially yield resources/credits or unlock new seeds
                gameState.resources.credits += Math.floor(Math.random() * 100); // Example: earns credits
                console.log(\`\${plant.species} has matured!\`);
            } else if (plant.stage === 'mature') {
                // Ready for harvest or can produce more seeds/mutations
                console.log(\`\${plant.species} is ready for harvest.\`);
                // Trigger mutation check
                if (Math.random() < plant.mutationChance) {
                    console.log(\`\${plant.species} mutated!\`);
                    // Create a new mutated plant type (simplified)
                    plant.species = \`Mutated \${plant.species}\`;
                    plant.maxGrowth *= 1.2; // Harder to grow
                    plant.mutationChance *= 0.8; // Less chance of further mutation
                    plant.needs.water *= 1.1;
                    plant.needs.temp = Math.max(15, plant.needs.temp + Math.random() * 5);
                }
            }
        }
    });
}

function startGame() {
    console.log("Starting Astro-Gardener...");
    updateEnvironment();
    processPlantGrowth();
    gameState.day++;
    console.log("Day", gameState.day, "- Environment:", gameState.environment.weather, `(Temp: ${gameState.environment.temperature.toFixed(1)}°C, Light: ${gameState.environment.light.toFixed(0)}%)`);
    console.log("Resources:", gameState.resources);

    // Example: Add a new plant if none exist
    if (gameState.plants.length === 0 && gameState.day === 2) {
        gameState.plants.push({
            species: 'Sunpetal',
            stage: 'seedling',
            needs: { water: 15, light: 65, temp: 22 },
            growth: 5,
            maxGrowth: 120,
            mutationChance: 0.15
        });
        console.log("Planted a Sunpetal seed.");
    }
     // Example: Add another plant
     if (gameState.plants.length === 1 && gameState.day === 3) {
        gameState.plants.push({
            species: 'GlowMoss',
            stage: 'seedling',
            needs: { water: 10, light: 40, temp: 18 },
            growth: 2,
            maxGrowth: 90,
            mutationChance: 0.2
        });
        console.log("Planted GlowMoss.");
    }


    // Placeholder for rendering/UI update
    renderGame();
}

function renderGame() {
    // In a real game, this would update the canvas or DOM
    console.log("\n--- Current Status ---");
    console.log(`Day: ${gameState.day}`);
    console.log(`Weather: ${gameState.environment.weather} (Temp: ${gameState.environment.temperature.toFixed(1)}°C, Light: ${gameState.environment.light.toFixed(0)}%)`);
    console.log("Resources:", gameState.resources);
    console.log("Plants:");
    if (gameState.plants.length === 0) {
        console.log("  None planted yet.");
    } else {
        gameState.plants.forEach(plant => {
            console.log(`  - ${plant.species} (Stage: ${plant.stage}) | Growth: ${plant.growth.toFixed(1)}/${plant.maxGrowth} | Needs: W:${plant.needs.water}, L:${plant.needs.light}, T:${plant.needs.temp}`);
        });
    }
    console.log("----------------------\n");
}

// --- Game Loop Simulation ---
// In a real game, this would be managed by requestAnimationFrame or setInterval
console.log("Initializing Astro-Gardener...");
// Initial setup for day 1
updateEnvironment();
console.log("Initial Environment:", gameState.environment.weather, `(Temp: ${gameState.environment.temperature.toFixed(1)}°C, Light: ${gameState.environment.light.toFixed(0)}%)`);
renderGame(); // Show initial state before any plants

// Simulate a few days
console.log("\n--- Simulating Game Days ---");
startGame(); // Day 2
startGame(); // Day 3
startGame(); // Day 4
startGame(); // Day 5
