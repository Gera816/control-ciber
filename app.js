// 1. Importamos el núcleo de Firebase
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

// 3. Inicializamos la app y la base de datos
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
    // FUNCIÓN NUEVA: Mostrar/Ocultar y crear las 30 PCs
    const actualizarVisibilidadPC = () => {
        if (salaSelect.value === 'Sala Digital') {
            contenedorPC.style.display = 'block'; // Mostramos el cuadro
            pcSelect.required = true;
            
            // Si está vacío, creamos las 30 opciones con un ciclo (magia de programador)
            if (pcSelect.options.length === 0) {
                for (let i = 1; i <= 30; i++) {
                    const opcion = document.createElement('option');
                    opcion.value = `PC ${i}`;
                    opcion.text = `PC ${i}`;
                    pcSelect.appendChild(opcion);
                }
            }
        } else {
            contenedorPC.style.display = 'none'; // Ocultamos el cuadro
            pcSelect.required = false;
        }
    };

    // Escuchamos cada vez que el usuario cambia la sala
    salaSelect.addEventListener('change', actualizarVisibilidadPC);
    // Ejecutamos una vez al inicio para que detecte la sala por defecto
    actualizarVisibilidadPC();

    // Cuando le dan clic al botón Azul
    formulario.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const nombreUsuario = document.getElementById('nombre').value;
        const salaSeleccionada = salaSelect.value;
        // Si es sala digital guardamos la PC, si no, le ponemos "N/A" (No Aplica)
        const pcSeleccionada = (salaSeleccionada === 'Sala Digital') ? pcSelect.value : "N/A";

        try {
            await addDoc(collection(db, "registros"), {
                nombre: nombreUsuario,
                sala: salaSeleccionada,
                computadora: pcSeleccionada,
                hora_entrada: serverTimestamp(), 
                estado: "activo" 
            });

            alert("¡Entrada registrada con éxito en la nube! 🚀");
            formulario.reset(); 
            actualizarVisibilidadPC(); // Reseteamos la vista de las PCs

        } catch (error) {
            console.error("Error al guardar: ", error);
            alert("Hubo un error al registrar. Revisa la consola.");
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
            let tiempoMilisegundos = 0;
            
            if (datos.hora_entrada) {
                const fecha = datos.hora_entrada.toDate();
                horaFormateada = fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                tiempoMilisegundos = fecha.getTime();
            }

            // AQUI CAMBIAMOS EL TEXTO DEL BOTÓN ROJO A "Registrar Salida"
            const fila = `
                <tr>
                    <td><strong>${datos.nombre}</strong></td>
                    <td>${datos.sala}</td>
                    <td>${datos.computadora}</td>
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
            
            const mensaje = `El usuario estuvo: ${horas} horas con ${minutosExtra} minutos.\n¿Confirmar salida y quitar de la lista?`;
            
            if(confirm(mensaje)) {
                try {
                    const referenciaDoc = doc(db, "registros", idRegistro);
                    await updateDoc(referenciaDoc, {
                        estado: "terminado",
                        hora_salida: serverTimestamp(),
                        duracion_minutos: minutosTotales
                    });
                } catch(error) {
                    console.error("Error al actualizar la salida:", error);
                }
            }
        }
    });
}