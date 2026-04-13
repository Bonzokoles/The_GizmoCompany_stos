import * as net from 'net';

export async function isServiceUp(port: number, host = 'localhost'): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 2000;

        socket.setTimeout(timeout);
        socket.connect(port, host, () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
    });
}

export async function assertServiceUp(port: number, name: string): Promise<void> {
    const up = await isServiceUp(port);
    if (!up) {
        throw new Error(`⛔ ${name} nie odpowiada na porcie ${port}. Uruchom serwis przed testami.`);
    }
}

export async function requireServices(ports: number[]): Promise<void> {
    for (const port of ports) {
        const up = await isServiceUp(port);
        if (!up) {
            throw new Error(
                `Service on port ${port} is not running. Start all services before running integration tests.\n` +
                `Check: netstat -ano | findstr ":3701 :4224 :5180"`,
            );
        }
    }
}