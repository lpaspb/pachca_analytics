import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsComparison } from "@/types/api";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ComparisonMetricsProps {
  comparison: AnalyticsComparison;
}

export default function ComparisonMetrics({ comparison }: ComparisonMetricsProps) {
  // Function to display change with icons and colors
  const renderChange = (percentage: number, absolute: number, positiveIsGood = true) => {
    // Handle NaN or infinity cases
    if (isNaN(percentage) || !isFinite(percentage)) {
      percentage = 0;
    }
    
    const isPositive = percentage > 0;
    const isNeutral = percentage === 0;
    
    let colorClass = "text-muted-foreground";
    let icon = <MinusIcon className="h-4 w-4" />;
    
    if (!isNeutral) {
      if ((isPositive && positiveIsGood) || (!isPositive && !positiveIsGood)) {
        colorClass = "text-green-500";
        icon = <ArrowUpIcon className="h-4 w-4" />;
      } else {
        colorClass = "text-red-500";
        icon = <ArrowDownIcon className="h-4 w-4" />;
      }
    }
    
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        {icon}
        <span>{Math.abs(percentage).toFixed(2)}% ({absolute > 0 ? "+" : ""}{absolute.toFixed(0)})</span>
      </div>
    );
  };

  // Helper to calculate percentage of messages with reactions
  const getMessagesWithReactionsPercent = (totalMessages: number, messagesWithReactions: number) => {
    if (totalMessages === 0) return 0;
    return Math.round((messagesWithReactions / totalMessages) * 100);
  };

  return (
    <Card className="animate-scale-in animate-delay-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Сравнение с предыдущим периодом
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(comparison.dateRange.from, 'dd.MM.yyyy', { locale: ru })} - {format(comparison.dateRange.to || comparison.dateRange.from, 'dd.MM.yyyy', { locale: ru })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Сообщения</span>
                <Badge variant="outline">{comparison.totalMessages}</Badge>
              </div>
              {renderChange(
                comparison.percentageDifferences.totalMessages,
                comparison.absoluteDifferences.totalMessages
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Прочтения</span>
                <Badge variant="outline">{comparison.totalReads}</Badge>
              </div>
              {renderChange(
                comparison.percentageDifferences.totalReads,
                comparison.absoluteDifferences.totalReads
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Реакции</span>
                <Badge variant="outline">{comparison.totalReactions}</Badge>
              </div>
              {renderChange(
                comparison.percentageDifferences.totalReactions,
                comparison.absoluteDifferences.totalReactions
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">С реакциями</span>
                <Badge variant="outline">
                  {getMessagesWithReactionsPercent(comparison.totalMessages, comparison.messagesWithReactions)}%
                </Badge>
              </div>
              {renderChange(
                comparison.percentageDifferences.messagesWithReactions,
                comparison.absoluteDifferences.messagesWithReactions
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Комментарии</span>
                <Badge variant="outline">{comparison.totalThreadMessages || 0}</Badge>
              </div>
              {renderChange(
                comparison.percentageDifferences.totalThreadMessages,
                comparison.absoluteDifferences.totalThreadMessages || 0
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">ER</span>
                <Badge variant="outline">
                  {comparison.engagementRate?.toFixed(2) || "0.00"}%
                </Badge>
              </div>
              {renderChange(
                comparison.percentageDifferences.engagementRate || 0,
                comparison.absoluteDifferences.engagementRate || 0
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
