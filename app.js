// 1. Importamos el núcleo de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
// IMPORTAMOS nuevas herramientas: query, where, onSnapshot, doc, updateDoc
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

if (formulario) {
    formulario.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const nombreUsuario = document.getElementById('nombre').value;
        const salaSeleccionada = document.getElementById('sala').value;
        const pcSeleccionada = document.getElementById('computadora').value;

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
    // Le decimos a Firebase: "Tráeme solo los registros que digan 'activo'"
    const consultaActivos = query(collection(db, "registros"), where("estado", "==", "activo"));

    // onSnapshot es la magia que actualiza la pantalla en TIEMPO REAL
    onSnapshot(consultaActivos, (snapshot) => {
        listaActivas.innerHTML = ""; // Limpiamos la tabla antes de re-dibujar

        snapshot.forEach((documento) => {
            const datos = documento.data();
            const id = documento.id; // El ID único de este registro

            // Extraemos la hora para mostrarla bonita
            let horaFormateada = "Calculando...";
            let tiempoMilisegundos = 0;
            
            if (datos.hora_entrada) {
                const fecha = datos.hora_entrada.toDate();
                horaFormateada = fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                tiempoMilisegundos = fecha.getTime();
            }

            // Dibujamos la fila HTML inyectando los datos
            const fila = `
                <tr>
                    <td><strong>${datos.nombre}</strong></td>
                    <td>${datos.sala}</td>
                    <td>${datos.computadora}</td>
                    <td>${horaFormateada}</td>
                    <td>
                        <button class="btn-salida" data-id="${id}" data-tiempo="${tiempoMilisegundos}" style="background-color: #ef4444;">Terminar y Cobrar</button>
                    </td>
                </tr>
            `;
            listaActivas.innerHTML += fila;
        });
    });

    // Escuchamos los clics en los botones rojos de "Terminar y Cobrar"
    listaActivas.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-salida')) {
            const idRegistro = e.target.getAttribute('data-id');
            const tiempoEntrada = parseInt(e.target.getAttribute('data-tiempo'));
            
            // Hacemos la matemática del tiempo
            const ahora = Date.now();
            const diferenciaMilisegundos = ahora - tiempoEntrada;
            
            const minutosTotales = Math.floor(diferenciaMilisegundos / (1000 * 60));
            const horas = Math.floor(minutosTotales / 60);
            const minutosExtra = minutosTotales % 60;
            
            const mensaje = `El usuario estuvo: ${horas} horas con ${minutosExtra} minutos.\n¿Confirmar salida y quitar de la lista?`;
            
            // Si le damos a "Aceptar" en la ventanita, lo actualizamos en Firebase
            if(confirm(mensaje)) {
                try {
                    const referenciaDoc = doc(db, "registros", idRegistro);
                    // Cambiamos el estado a terminado y guardamos cuánto duró
                    await updateDoc(referenciaDoc, {
                        estado: "terminado",
                        hora_salida: serverTimestamp(),
                        duracion_minutos: minutosTotales
                    });
                    // ¡No hace falta borrar la fila! onSnapshot detectará que ya no es "activo" y la quitará sola.
                } catch(error) {
                    console.error("Error al actualizar la salida:", error);
                }
            }
        }
    });
}