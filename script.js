// Externí JS soubor (script.js)

document.addEventListener('DOMContentLoaded', () => {
    
    const tasksContainer = document.getElementById('tasks-container');
    const jsonFilePath = 'data.json'; // Cesta k JSON souboru

    /**
     * Asynchronní funkce pro načtení a zpracování JSON dat.
     */
    async function loadAndDisplayTasks() {
        try {
            // 1. Nastavíme kontejner na stav načítání
            tasksContainer.classList.add('loading-state');

            // 2. Požadavek na data pomocí fetch API
            const response = await fetch(jsonFilePath);

            // 3. Kontrola status kódu (např. 200 OK)
            if (!response.ok) {
                // Vyhodí chybu, pokud je status 404, 500, apod.
                throw new Error(`Chyba sítě: Nelze načíst data. Status: ${response.status}`);
            }

            // 4. Parsování těla odpovědi do JSON objektu
            const data = await response.json();
            
            // 5. Zpracování a vložení dat do HTML
            displayTasks(data);

        } catch (error) {
            // Zobrazí chybu v konzoli a v kontejneru pro uživatele
            console.error("Načítání dat selhalo:", error);
            tasksContainer.innerHTML = `<p class="error-state" style="color: red;">Chyba při načítání dat: ${error.message}</p>`;

        } finally {
            // Bez ohledu na výsledek odstraníme stav načítání
            tasksContainer.classList.remove('loading-state');
        }
    }

    /**
     * Vykreslí načtená data do HTML.
     * @param {Object} data - Objekty načtené z JSONu.
     */
    function displayTasks(data) {
        if (!data || !data.tasks || data.tasks.length === 0) {
            tasksContainer.innerHTML = '<p>Žádné úkoly k zobrazení.</p>';
            return;
        }

        let htmlContent = `<h3>${data.title}</h3>`;
        
        // Vytvoření listu z úkolů
        data.tasks.forEach(task => {
            htmlContent += `<div class="task-item">
                                <strong>ID ${task.id}:</strong> ${task.description}
                            </div>`;
        });

        // Vložení finálního HTML do kontejneru
        tasksContainer.innerHTML = htmlContent;
    }

    // Spuštění načítání dat po načtení DOM
    loadAndDisplayTasks();
});