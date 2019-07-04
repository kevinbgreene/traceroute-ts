import { createSocket, createChecksum, Protocol, SocketOption, SocketLevel } from 'raw-socket'

interface ITraceResult {
    address: string
    duration: number
}

const NO_OP = () => {}

const ECHO_REQUEST = "08"
const CODE = "00"

async function traceDestination({
   destination,
   maxHops = 64
}: {
    destination: string
    maxHops?: number
}): Promise<Array<ITraceResult>> {
    return new Promise((resolve, reject) => {
        const result: Array<ITraceResult> = []
        const socket = createSocket({ protocol: Protocol.ICMP })
        let ttl: number = 1
        let startTime: number
        // let responseCount: number = 0

        // const buf: Buffer = Buffer.from("080040aab75400010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000", "hex")
        const checksum: Buffer = Buffer.alloc(2)
        checksum.writeInt16LE(createChecksum(Buffer.from("08000000")), 0)
        const message: string = `${ECHO_REQUEST}${CODE}${checksum.toString('hex')}`
        const buf: Buffer = Buffer.from(message, 'hex')

        console.log('checksum: ', checksum.toString('hex'))
        console.log('message: ', message)

        socket.on('error', (buf: Buffer) => {
            console.log('error: ', buf)
        })

        socket.on("message", (buffer: Buffer, address: string) => {
            console.log('message: ', buffer.toString('hex'))
            const finishTime = Date.now()
            const duration = finishTime - startTime

            result.push({
                address,
                duration,
            })

            if (address !== destination && ttl < maxHops) {
                ttl += 1
                runTrace()
            } else if (address !== destination) {
                reject(new Error(`Exceeded maxHops without reaching destination`))
            } else {
                socket.close()
                resolve(result)
            }
        });

        function runTrace(): void {
            console.log('send: ' + ttl)

            socket.setOption(SocketLevel.IPPROTO_IP, SocketOption.IP_TTL, ttl)

            startTime = Date.now()
            socket.send(buf, 0, buf.length, destination, NO_OP, NO_OP)
        }

        runTrace()
    })
}

traceDestination({
    destination: '108.174.10.10'
}).then((result) => console.log('result: ', result))