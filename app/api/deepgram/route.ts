import { NextResponse, type NextRequest } from "next/server";
import {
  createClient,
  LiveClient,
  LiveConnectionState,
  LiveTranscriptionEvents,
  type LiveSchema,
  type LiveTranscriptionEvent,
  type DeepgramClient,
  type PrerecordedClient,
} from "@deepgram/sdk";

// export const revalidate = 0;

export async function POST(request: NextRequest) {
  const blob = await request.blob();
  const source = Buffer.from(await blob.arrayBuffer());
  const apiKey = process.env.DEEPGRAM_API_KEY ?? "<STUB_API_KEY>";
  // const options = {
  //   model: 'nova-2',
  //   // model: 'nova-2-conversationalai',
  //   // model: "nova-2-phonecall",
  //   interim_results: true,
  //   // interim_results: false,
  //   filler_words: false,
  //   utterance_end_ms: 1000 * 5,
  //   // utterance_end_ms: 1000,
  //   // utterance_end_ms: 3000,
  //   // language: "en",
  //   language: "en-US",
  //   // language: "en-GB",
  //   punctuate: false,
  //   smart_format: false,
  //   endpointing: 1000 * 5,
  //   // endpointing: 1000 * 10,
  // };
  const client = createClient(apiKey);
  const response = await client.listen.prerecorded.transcribeFile(
    source,
    {
      model: "nova-2",
    }
  );
  console.log('/api/deepgram: response=', response);

  return NextResponse.json(response);
}
