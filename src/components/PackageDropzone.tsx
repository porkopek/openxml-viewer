import type { MutableRefObject } from 'react';
import { Stack, Text } from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { IconFileZip, IconUpload, IconX } from '@tabler/icons-react';
import classes from './PackageDropzone.module.css';

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
      radius={0}
      className={classes.root}
      onDrop={(files) => {
        const [nextFile] = files;
        if (nextFile) {
          onFile(nextFile);
        }
      }}
      onReject={() => onReject('Please choose a valid OpenXML package such as .docx, .xlsx, .pptx, or .zip.')}
    >
      <Stack gap="sm" align="center" className={classes.content}>
        <div>
          <Dropzone.Accept>
            <IconUpload size={52}   stroke={1.5} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={52}   stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFileZip size={52} color="var(--mantine-color-dimmed)" stroke={1.5} />
          </Dropzone.Idle>
        </div>

        <Stack gap={4} align="center">
          <Text size="2rem" fw={600} lh={1.1} c="inherit">
            OpenXML Viewer
          </Text>
          <Text size="sm" c="inherit">
            Drop a package or click to choose one.
          </Text>
          <Text size="sm" c="inherit">
            .docx · .xlsx · .pptx · .zip
          </Text>
        </Stack>

        {error ? (
          <Text size="sm" c="red.6">
            {error}
          </Text>
        ) : null}
      </Stack>
    </Dropzone>
  );
}
