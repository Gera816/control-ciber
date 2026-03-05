// 1. Importamos herramientas
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// 2. Tus llaves de acceso
const firebaseConfig = {
    apiKey: "AIzaSyDKggkt1gbl4CFE4gHFciwQZU_5o8J4mkQ",
    authDomain: "salas-e23cd.firebaseapp.com",
    projectId: "salas-e23cd",
    storageBucket: "salas-e23cd.firebasestorage.app",
    messagingSenderId: "992294350029",
    appId: "1:992294350029:web:49150e0874dd639b0bcd84"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 4. LÓGICA VENTANA 1: REGISTRAR ENTRADA
// ==========================================
const formulario = document.getElementById('formulario-entrada');
const salaSelect = document.getElementById('sala');
const contenedorPC = document.getElementById('contenedor-pc');
const pcSelect = document.getElementById('computadora');

if (formulario) {
    const actualizarVisibilidadPC = () => {
        if (salaSelect.value === 'Sala Digital') {
            contenedorPC.style.display = 'block'; 
            pcSelect.required = true;
            if (pcSelect.options.length === 0) {
                for (let i = 1; i <= 30; i++) {
                    const opcion = document.createElement('option');
                    opcion.value = `PC ${i}`; opcion.text = `PC ${i}`;
                    pcSelect.appendChild(opcion);
                }
            }
        } else {
            contenedorPC.style.display = 'none'; 
            pcSelect.required = false;
        }
    };

    salaSelect.addEventListener('change', actualizarVisibilidadPC);
    actualizarVisibilidadPC();

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const nombreUsuario = document.getElementById('nombre').value;
        const salaSeleccionada = salaSelect.value;
        const pcSeleccionada = (salaSeleccionada === 'Sala Digital') ? pcSelect.value : "N/A";

        try {
            await addDoc(collection(db, "registros"), {
                nombre: nombreUsuario,
                sala: salaSeleccionada,
                computadora: pcSeleccionada,
                hora_entrada: serverTimestamp(), 
                estado: "activo" 
            });
            alert("¡Entrada registrada con éxito! 🚀");
            formulario.reset(); 
            actualizarVisibilidadPC(); 
        } catch (error) {
            console.error(error); alert("Hubo un error.");
        }
    });
}

// ==========================================
// 5. LÓGICA VENTANA 2: PANEL DE SALIDAS
// ==========================================
const listaActivas = document.getElementById('lista-activas');

if (listaActivas) {
    const consultaActivos = query(collection(db, "registros"), where("estado", "==", "activo"));

    onSnapshot(consultaActivos, (snapshot) => {
        listaActivas.innerHTML = ""; 
        snapshot.forEach((documento) => {
            const datos = documento.data();
            const id = documento.id; 

            let horaFormateada = "Calculando...";
            let fechaFormateada = "...";
            let tiempoMilisegundos = 0;
            
            if (datos.hora_entrada) {
                const fecha = datos.hora_entrada.toDate();
                horaFormateada = fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                fechaFormateada = fecha.toLocaleDateString(); // SACAMOS LA FECHA
                tiempoMilisegundos = fecha.getTime();
            }

            const fila = `
                <tr>
                    <td><strong>${datos.nombre}</strong></td>
                    <td>${datos.sala}</td>
                    <td>${datos.computadora}</td>
                    <td>${fechaFormateada}</td>
                    <td>${horaFormateada}</td>
                    <td>
                        <button class="btn-salida" data-id="${id}" data-tiempo="${tiempoMilisegundos}" style="background-color: #ef4444;">Registrar Salida</button>
                    </td>
                </tr>
            `;
            listaActivas.innerHTML += fila;
        });
    });

    listaActivas.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-salida')) {
            const idRegistro = e.target.getAttribute('data-id');
            const tiempoEntrada = parseInt(e.target.getAttribute('data-tiempo'));
            const ahora = Date.now();
            const diferenciaMilisegundos = ahora - tiempoEntrada;
            const minutosTotales = Math.floor(diferenciaMilisegundos / (1000 * 60));
            const horas = Math.floor(minutosTotales / 60);
            const minutosExtra = minutosTotales % 60;
            
            if(confirm(`El usuario estuvo: ${horas} horas con ${minutosExtra} minutos.\n¿Confirmar salida y mandarlo al historial?`)) {
                try {
                    const referenciaDoc = doc(db, "registros", idRegistro);
                    await updateDoc(referenciaDoc, {
                        estado: "terminado",
                        hora_salida: serverTimestamp(),
                        duracion_minutos: minutosTotales
                    });
                } catch(error) { console.error(error); }
            }
        }
    });
}

// ==========================================
// 6. LÓGICA VENTANA 3: HISTORIAL (NUEVO)
// ==========================================
const listaHistorial = document.getElementById('lista-historial');

if (listaHistorial) {
    // Pedimos a la nube TODOS los que digan "terminado"
    const consultaHistorial = query(collection(db, "registros"), where("estado", "==", "terminado"));

    onSnapshot(consultaHistorial, (snapshot) => {
        listaHistorial.innerHTML = ""; 
        
        // Los metemos a un arreglo para poder ordenarlos del más reciente al más antiguo
        let registros = [];
        snapshot.forEach((doc) => {
            registros.push(doc.data());
        });

        // Magia para ordenar por fecha de salida
        registros.sort((a, b) => {
            if(!a.hora_salida || !b.hora_salida) return 0;
            return b.hora_salida.toMillis() - a.hora_salida.toMillis();
        });

        registros.forEach((datos) => {
            let fechaEntrada = "", horaEntrada = "", horaSalida = "";
            let duracion = datos.duracion_minutos !== undefined ? `${datos.duracion_minutos} min` : "N/A";

            if (datos.hora_entrada) {
                const fEnt = datos.hora_entrada.toDate();
                fechaEntrada = fEnt.toLocaleDateString();
                horaEntrada = fEnt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
            if (datos.hora_salida) {
                const fSal = datos.hora_salida.toDate();
                horaSalida = fSal.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }

            const fila = `
                <tr>
                    <td><strong>${datos.nombre}</strong></td>
                    <td>${datos.sala}</td>
                    <td>${datos.computadora}</td>
                    <td>${fechaEntrada}</td>
                    <td>${horaEntrada}</td>
                    <td>${horaSalida}</td>
                    <td style="color: #2563eb;"><strong>${duracion}</strong></td>
                </tr>
            `;
            listaHistorial.innerHTML += fila;
        });
    });
}