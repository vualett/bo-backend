const chunkBy = (n: number) => (number: number): number[] => {
    const chunks: number[] = new Array<number>(Math.floor(number / n)).fill(n);
    const remainder = number % n;

    if (remainder > 0) {
        chunks.push(remainder);
    }

    return chunks;
};

export default chunkBy;