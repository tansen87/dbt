import { IconFileTypeCsv } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { invoke } from '@tauri-apps/api/core';

import { Dialog } from '@/components/custom/Dialog';
import { TooltipButton } from '@/components/custom/button';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export function LoadCsvFileDialog() {
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: {
        path: '',
        delimiter: ',',
        quote: '"',
        tableName: 't1',
        varchar: 'true',
    },
  });

  async function onSubmit(values) {
    const { path, delimiter, quote, tableName, varchar } = values;

    const result: string = await invoke("load_csv", {
      path: path,
      delimiter: delimiter,
      quote: quote,
      tableName: tableName,
      varchar: varchar
    });
    
    if (JSON.stringify(result).startsWith("load failed")) {
      console.log(result);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Load csv into duckdb"
      className="min-w-[800px] min-h-[500px]"
      trigger={<TooltipButton tooltip="Add data" icon={<IconFileTypeCsv />} />}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
          <div className="flex-1 space-y-4">
            <FormField
              control={form.control}
              name="path"
              render={({ field }) => (
                <FormItem className="flex items-center w-[62.5%]">
                  <FormLabel className="w-1/5 mr-2 mt-2">Path</FormLabel>
                  <FormControl className="w-4/5">
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="delimiter"
              render={({ field }) => (
                <FormItem className="flex items-center w-[62.5%]">
                  <FormLabel className="w-1/5 mr-2 mt-2">Delimiter</FormLabel>
                  <FormControl className="w-4/5">
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quote"
              render={({ field }) => (
                <FormItem className="flex items-center w-[62.5%]">
                  <FormLabel className="w-1/5 mr-2 mt-2">Quote</FormLabel>
                  <FormControl className="w-4/5">
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tableName"
              render={({ field }) => (
                <FormItem className="flex items-center w-[62.5%]">
                  <FormLabel className="w-1/5 mr-2 mt-2">Table name</FormLabel>
                  <FormControl className="w-4/5">
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="varchar"
              render={({ field }) => (
                <FormItem className="flex items-center w-[62.5%]">
                  <FormLabel className="w-1/5 mr-2 mt-2">Varchar</FormLabel>
                  <FormControl className="w-4/5">
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
          Ok
        </Button>
      </DialogFooter>
    </Dialog>
  );
}