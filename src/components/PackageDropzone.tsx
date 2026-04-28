import type { MutableRefObject } from 'react';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { IconFileZip, IconUpload, IconX } from '@tabler/icons-react';

const acceptedPackageTypes = {
  [MIME_TYPES.docx]: ['.docx', '.docm', '.dotx', '.dotm'],
  [MIME_TYPES.xlsx]: ['.xlsx', '.xlsm', '.xltx', '.xltm'],
  [MIME_TYPES.pptx]: ['.pptx', '.pptm', '.potx', '.potm', '.ppsx', '.ppsm'],
  [MIME_TYPES.zip]: ['.zip'],
};

interface PackageDropzoneProps {
  loading: boolean;
  error: string | null;
  openRef: MutableRefObject<(() => void) | null>;
  onFile: (file: File) => void;
  onReject: (message: string) => void;
}

export function PackageDropzone({ loading, error, openRef, onFile, onReject }: PackageDropzoneProps) {
  return (
    <Dropzone
      openRef={openRef}
      loading={loading}
      multiple={false}
      maxFiles={1}
      accept={acceptedPackageTypes}
      className="openxml-dropzone !rounded-none !border-0 flex h-screen w-full items-center justify-center bg-zinc-50 px-6 py-10 text-zinc-950 transition-colors duration-150 data-[accept]:bg-blue-500 data-[accept]:text-white data-[reject]:bg-red-50 data-[reject]:text-red-600"
      onDrop={(files) => {
        const [nextFile] = files;
        if (nextFile) {
          onFile(nextFile);
        }
      }}
      onReject={() => onReject('Please choose a valid OpenXML package such as .docx, .xlsx, .pptx, or .zip.')}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 text-center" style={{ pointerEvents: 'none' }}>
        <div className="dropzone-icon-wrapper flex items-center justify-center">
          <Dropzone.Accept>
            <IconUpload size={52} className="dropzone-icon" stroke={1.5} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={52} className="dropzone-icon dropzone-icon-reject" stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFileZip size={52} className="dropzone-icon" stroke={1.5} />
          </Dropzone.Idle>
        </div>

        <div className="space-y-2">
          <h1 className="dropzone-title text-3xl font-semibold tracking-tight">OpenXML Viewer</h1>
          <p className="dropzone-muted text-sm">Drop a package or click to choose one.</p>
          <p className="dropzone-muted text-sm">.docx · .xlsx · .pptx · .zip</p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Dropzone>
  );
}
