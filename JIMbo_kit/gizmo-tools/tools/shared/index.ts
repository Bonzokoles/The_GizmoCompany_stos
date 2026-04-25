export function log(message: string): void {
    console.log(message);
}

export function errorHandler(error: Error): void {
    console.error('An error occurred:', error.message);
}