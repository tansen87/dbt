import { IconDatabasePlus } from '@tabler/icons-react';
import * as dialog from '@tauri-apps/plugin-dialog';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { getDB } from '@/api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialectConfig, useDBListStore } from '@/stores/dbList';

export function DatabaseDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<DialectConfig>();
  const appendDB = useDBListStore((state) => state.append);

  async function onSubmit(values: DialectConfig) {
    const data = await getDB({ ...values });
    appendDB(data);
    setOpen(false);
  }

  const watchDialect = form.watch('dialect');

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="New Connection"
      className="min-w-[800px] min-h-[500px]"
      trigger={<TooltipButton tooltip="Add data" icon={<IconDatabasePlus />} />}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
          <div className="flex-1 space-y-4">
            <FormField
              control={form.control}
              name="dialect"
              render={({ field }) => (
                <FormItem className="flex items-center w-full">
                  <FormLabel className="w-1/5 mr-2 mt-2 shrink-0">Dialect</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    {...field}
                  >
                    <FormControl className="flex-grow">
                      <SelectTrigger>
                        <SelectValue placeholder="Select a dialect" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="duckdb">DuckDB</SelectItem>
                      <SelectItem value="folder">Data Folder</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {watchDialect == 'duckdb' ||
            watchDialect == 'folder' ? (
              <>
                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem className="flex items-center w-full">
                      <FormLabel className="w-1/5 mr-2 mt-2 shrink-0">Path</FormLabel>
                      <FormControl className="flex-grow">
                        <div className="flex w-full items-center gap-1">
                        <Input {...field} className="w-full" />
                        <Button
                          variant="outline"
                          onClick={async (e) => {
                            e.preventDefault();
                            const file = await dialog.open({
                              multiple: false,
                              directory:
                                watchDialect == 'folder',
                            });
                            if (file) {
                              form.setValue('path', file);
                            }
                          }}
                        >
                          Select
                        </Button>
                      </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cwd"
                  render={({ field }) => (
                    <FormItem className="flex items-center w-full">
                      <FormLabel className="w-1/5 mr-2 mt-2 shrink-0">
                        Work Path
                      </FormLabel>
                      <FormControl className="flex-grow">
                        <Input {...field} className="w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}
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
