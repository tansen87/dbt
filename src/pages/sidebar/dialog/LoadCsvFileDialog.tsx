import { IconFileTypeCsv } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
// import { useAtom } from 'jotai';

import { getDB } from '@/api';
import { Dialog } from '@/components/custom/Dialog';
import { TooltipButton } from '@/components/custom/button';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DuckdbConfig, useDBListStore } from '@/stores/dbList';
// import { settingAtom } from '@/stores/setting';

export function LoadCsvFileDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const appendDB = useDBListStore((state) => state.append);
  // const [settings] = useAtom(settingAtom);

  const form = useForm({
    defaultValues: {
        path: '',
        delimiter: ',',
        quote: '"',
        tableName: 't1',
        varchar: 'true',
    },
  });

  async function onSubmit(values: { path: string; delimiter: string; quote: string; tableName: string; varchar: string; }) {
    const { path, delimiter, quote, tableName, varchar } = values;

    if (!path || !delimiter || !tableName || !varchar) {
      let message = 'The following fields cannot be empty:\n';
      if (!path) message += '- Csv path\n';
      if (!delimiter) message += '- Delimiter\n';
      if (!tableName) message += '- Table name\n';
      if (!varchar) message += '- Varchar\n';

      toast.error(message);
      return false;
    }

    try {
      const result = await invoke("load_csv", { path, delimiter, quote, tableName, varchar });

      const duckdbConfig: DuckdbConfig = {
        path: path.replace(/\.[^/.]+$/, '.duckdb'),
        dialect: 'duckdb',
      };
      const data = await getDB(duckdbConfig);
      appendDB(data);
      setOpen(false);
      toast.success(`Load CSV successfully, elapsed time ${result} s`);
      return true;
    } catch (e) {
      toast.error(`${e}`);
      return false;
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Load csv into duckdb"
      className="min-w-[800px] min-h-[500px]"
      trigger={<TooltipButton tooltip="Load CSV" icon={<IconFileTypeCsv />} />}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
          <div className="flex-1 space-y-4">
            <FormField
              control={form.control}
              name="path"
              render={({ field }) => (
                <FormItem className="flex items-center w-full">
                  <FormLabel className="w-1/5 mr-2 mt-2 shrink-0">Csv path</FormLabel>
                  <FormControl className="flex-grow">
                    <Input {...field} className="w-full" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="delimiter"
              render={({ field }) => (
                <FormItem className="flex items-center w-full">
                  <FormLabel className="w-1/5 mr-2 mt-2 shrink-0">Delimiter</FormLabel>
                  <FormControl className="flex-grow">
                    <Input {...field} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quote"
              render={({ field }) => (
                <FormItem className="flex items-center w-full">
                  <FormLabel className="w-1/5 mr-2 mt-2 shrink-0">Quote</FormLabel>
                  <FormControl className="flex-grow">
                    <Input {...field} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tableName"
              render={({ field }) => (
                <FormItem className="flex items-center w-full">
                  <FormLabel className="w-1/5 mr-2 mt-2 shrink-0">Table name</FormLabel>
                  <FormControl className="flex-grow">
                    <Input {...field} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="varchar"
              render={({ field }) => (
                <FormItem className="flex items-center w-full">
                  <FormLabel className="w-1/5 mr-2 mt-2 shrink-0">Varchar</FormLabel>
                  <FormControl className="flex-grow">
                    <Input {...field} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          onClick={async (e) => {
            e.preventDefault();
            setIsSubmitting(true);

            const success = await form.handleSubmit(async (values) => {
              return await onSubmit(values);
            })();

            if (success) {
              setOpen(false);
            }

            setIsSubmitting(false);
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Loading...' : 'Ok'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}